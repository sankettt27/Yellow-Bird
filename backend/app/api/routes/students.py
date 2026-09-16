"""
Student management CRUD routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import io
import openpyxl

from app.core.database import get_db
from app.models.student import Student
from app.models.user import User
from app.models.enums import UserRole
from app.schemas import StudentCreate, StudentUpdate, StudentResponse, PaginatedResponse
from app.api.deps import get_current_user, require_school_admin

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=PaginatedResponse)
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    class_name: str | None = Query(None),
    bus_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """List students with pagination and filtering."""
    query = select(Student)

    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(Student.school_id == current_user.school_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Student.full_name.ilike(pattern),
                Student.class_name.ilike(pattern),
                Student.roll_number.ilike(pattern),
            )
        )

    if class_name:
        query = query.where(Student.class_name == class_name)

    if bus_id:
        query = query.where(Student.assigned_bus_id == bus_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Student.created_at.desc())
    result = await db.execute(query)
    students = result.scalars().all()

    import math
    return PaginatedResponse(
        items=[StudentResponse.model_validate(s) for s in students],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Create a new student."""
    if current_user.role == UserRole.SCHOOL_ADMIN:
        data = data.model_copy(update={"school_id": current_user.school_id})

    student = Student(**data.model_dump())
    db.add(student)
    await db.flush()
    return StudentResponse.model_validate(student)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == UserRole.SCHOOL_ADMIN and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return StudentResponse.model_validate(student)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: str,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == UserRole.SCHOOL_ADMIN and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(student, key, value)

    await db.flush()
    return StudentResponse.model_validate(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role == UserRole.SCHOOL_ADMIN and student.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(student)

@router.post("/upload")
async def upload_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Bulk upload students via Excel file (.xlsx)"""
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    try:
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
        
        # Define expected columns
        expected_cols = ["Student Name", "Class", "Section", "Roll No"]
        
        # Read header
        header = [cell.value for cell in sheet[1]]
        
        # Map indices safely
        col_indices = {}
        for expected in expected_cols:
            try:
                # find case-insensitive matching header
                idx = next(i for i, h in enumerate(header) if h and str(h).strip().lower() == expected.lower())
                col_indices[expected] = idx
            except StopIteration:
                raise HTTPException(status_code=400, detail=f"Missing required column: {expected}")
                
        skipped_count = 0
        added_count = 0
        seen_students = set()
        
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # Check if row is empty
            if all(cell is None for cell in row):
                continue
                
            name = row[col_indices["Student Name"]]
            class_name = row[col_indices["Class"]]
            section = row[col_indices["Section"]]
            roll_no = row[col_indices["Roll No"]]
            
            if not name:
                continue # Skip rows without a name
                
            name_str = str(name).strip()
            class_str = str(class_name).strip() if class_name is not None else None
            section_str = str(section).strip() if section is not None else None
            roll_str = str(roll_no).strip() if roll_no is not None else None

            # Deduplicate in current batch
            student_key = (name_str.lower(), (class_str or "").lower(), (section_str or "").lower(), (roll_str or "").lower())
            if student_key in seen_students:
                skipped_count += 1
                continue
            seen_students.add(student_key)

            # Check for exact duplicate in DB (case-insensitive name)
            query = select(Student).where(
                Student.school_id == current_user.school_id,
                func.lower(func.trim(Student.full_name)) == name_str.lower(),
                Student.class_name == class_str,
                Student.section == section_str,
                Student.roll_number == roll_str
            )
            existing = (await db.execute(query)).scalar_one_or_none()
            
            if existing:
                skipped_count += 1
                continue
                
            try:
                async with db.begin_nested():
                    student = Student(
                        school_id=current_user.school_id,
                        full_name=name_str,
                        class_name=class_str,
                        section=section_str,
                        roll_number=roll_str,
                    )
                    db.add(student)
                    await db.flush()
                    added_count += 1
            except Exception:
                skipped_count += 1
                continue
            
        await db.commit()
        return {
            "message": f"Successfully imported {added_count} students. Skipped {skipped_count} duplicates.",
            "added": added_count,
            "skipped": skipped_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Excel file: {str(e)}")

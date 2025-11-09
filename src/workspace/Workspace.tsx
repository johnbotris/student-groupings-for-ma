import type { ITeacher, School } from "../lib/school.ts"
import { useState } from "react"
import type { TeacherId } from "../lib/teacherId.ts"
import type { StudentId } from "../lib/studentId.ts"
import { count } from "../lib/count.ts"

interface StatsProps {
    school: School
    createGrouping: (teachers: TeacherId[], students: StudentId[]) => void
}

export default function Workspace({ school, createGrouping }: StatsProps) {
    const [teachers, setTeachers] = useState<TeacherId[]>([])
    const [students, setStudents] = useState<StudentId[]>([])

    const sortedTeachers = school
        .getTeachers()
        .toSorted((a, b) => b.students.length - a.students.length)

    const selectionSize = teachers.length + students.length

    const shouldHaveAtLeast = Math.round(teachers.length / 2)

    const candidateStudents = school.getStudentIds()

    const sortedCandidates = [...candidateStudents].toSorted((a, b) => {
        return (
            count(teachers, t =>
                school.getTeacher(t).students.some(s => s.id === b),
            ) -
            count(teachers, t =>
                school.getTeacher(t).students.some(s => s.id === a),
            )
        )
    })

    function onAcceptClicked() {
        createGrouping(teachers, students)
        setStudents([])
        setTeachers([])
    }

    return (
        <div className={"flex flex-row gap-2"}>
            <TeacherList
                items={sortedTeachers.map(teacher => {
                    const onClick = () => {
                        if (teachers.includes(teacher.id)) {
                            setTeachers(teachers.filter(t => t !== teacher.id))
                        } else {
                            setTeachers([...teachers, teacher.id])
                        }
                    }
                    return {
                        teacher,
                        value: school.getStudentIds({
                            teacherId: teacher.id,
                        }).size,
                        state: teachers.includes(teacher.id)
                            ? "selected"
                            : null,
                        onClick,
                    }
                })}
                school={school}
            />

            <div className={"flex flex-col w-fit gap-2"}>
                <button
                    type={"button"}
                    onClick={onAcceptClicked}
                    className={
                        "rounded-md border hover:bg-gray-100 cursor-pointer"
                    }
                >
                    accept {selectionSize}
                </button>
                <StudentsList
                    school={school}
                    items={sortedCandidates.map(studentId => {
                        let meetsCriteria = false
                        if (
                            count(teachers, t =>
                                school
                                    .getTeacher(t)
                                    .students.some(s => s.id === studentId),
                            ) >= shouldHaveAtLeast
                        ) {
                            meetsCriteria = true
                        }

                        const state = students.includes(studentId)
                            ? "selected"
                            : meetsCriteria
                              ? "meetsCriteria"
                              : null

                        const onClick = () => {
                            if (state === "selected") {
                                setStudents(
                                    students.filter(s => s !== studentId),
                                )
                            } else {
                                setStudents([...students, studentId])
                            }
                        }

                        return {
                            studentId,
                            value: 0,
                            onClick,
                            state,
                        }
                    })}
                />
            </div>
        </div>
    )
}

interface TeacherListItem {
    teacher: ITeacher
    value: number
    state: "selected" | null
    onClick: () => void
}

interface TeacherListProps {
    school: School
    items: TeacherListItem[]
}

function TeacherList({ school, items }: TeacherListProps) {
    return (
        <dl className={"flex flex-col flex-wrap w-fit"}>
            {items.map(item => {
                const bgClass =
                    item.state === "selected"
                        ? "bg-emerald-200"
                        : "odd:bg-gray-100"

                return (
                    <div
                        key={item.teacher.id}
                        onClick={() => item.onClick()}
                        className={`grid grid-cols-5 gap-8 px-2 cursor-pointer ${bgClass}`}
                    >
                        <dt className={"col-span-4"}>{item.teacher.id}</dt>
                        <dd>{item.value}</dd>
                    </div>
                )
            })}
        </dl>
    )
}

interface StudentListItem {
    studentId: string
    value: number
    onClick: () => void
    state: "selected" | "meetsCriteria" | null
}

interface StudentsListProps {
    school: School
    items: StudentListItem[]
}

function StudentsList({ items, school }: StudentsListProps) {
    return (
        <ul className={"flex flex-col flex-wrap w-fit"}>
            {items.map(item => {
                const bgClass = item.state
                    ? {
                          selected: "bg-blue-300",
                          meetsCriteria: "bg-yellow-50 odd:bg-yellow-100",
                      }[item.state]
                    : "odd:bg-blue-50"

                return (
                    <div
                        onClick={item.onClick}
                        key={item.studentId}
                        className={`px-2  ${bgClass} cursor-pointer`}
                    >
                        <li className={"col-span-4"}>{item.studentId}</li>
                    </div>
                )
            })}
        </ul>
    )
}

import type { ITeacher, School } from "../lib/school.ts"
import { useEffect, useState } from "react"
import type { TeacherId } from "../lib/teacherId.ts"
import type { StudentId } from "../lib/studentId.ts"
import { intersection } from "../lib/intersection.ts"
import { useDebugLog } from "../lib/useDebugLog.ts"
import { getId } from "../lib/getId.ts"
import { uniqueBy } from "../lib/uniqueBy.ts"
import { isNotNull } from "../lib/isNotNull.ts"

interface StatsProps {
    school: School
    createGrouping: (teachers: TeacherId[], students: StudentId[]) => void
}

export default function Workspace({ school, createGrouping }: StatsProps) {
    interface List {
        teacher: ITeacher | null
        teachers: ITeacher[]
        candidateStudents: StudentId[]
    }

    const [lists, setLists] = useState<List[]>([])

    useEffect(() => {
        setLists([
            {
                teacher: null,
                teachers: school.getTeachers(),
                candidateStudents: [...school.getStudentIds()],
            },
        ])
    }, [school])

    const candidates = lists.at(-1)?.candidateStudents ?? []

    function onAcceptClicked() {
        const teachers = lists
            .map(l => l.teacher)
            .filter(isNotNull)
            .map(t => t.id)
        const students = lists.at(-1)?.candidateStudents ?? []
        createGrouping(teachers, students)
    }

    useDebugLog({ lists })
    return (
        <div className={"flex flex-row gap-2"}>
            {lists.map(({ teacher, teachers, candidateStudents }, idx) => {
                function updateSelection(teacherId: TeacherId | null) {
                    const newTeacher = teacherId
                        ? school.getTeacher(teacherId)
                        : null

                    const prefix = lists.slice(0, idx)

                    const thisEntry = {
                        teacher: newTeacher,
                        teachers,
                        candidateStudents,
                    }

                    const newEntry = newTeacher
                        ? (() => {
                              const newCandidateStudents = intersection(
                                  newTeacher.students.map(getId),
                                  candidateStudents,
                              )

                              const newCandidateTeachers = uniqueBy(
                                  newCandidateStudents.flatMap(studentId =>
                                      [
                                          ...school.getTeacherIds({
                                              studentId,
                                          }),
                                      ].map(t => school.getTeacher(t)),
                                  ),
                                  getId,
                              ).filter(
                                  t =>
                                      !lists.some(
                                          list =>
                                              list.teacher?.id === t.id ||
                                              t.id === newTeacher.id,
                                      ),
                              )

                              return [
                                  {
                                      teacher: null,
                                      teachers: newCandidateTeachers,
                                      candidateStudents: newCandidateStudents,
                                  },
                              ]
                          })()
                        : []

                    console.debug(prefix, thisEntry, newEntry)
                    setLists([...prefix, thisEntry, ...newEntry])
                }

                return (
                    <TeacherList
                        key={`${teacher?.id}`}
                        teachers={teachers}
                        selectedTeacherId={teacher?.id ?? null}
                        onTeacherSelected={updateSelection}
                        school={school}
                        candidateStudents={candidateStudents}
                    />
                )
            })}

            <div className={"flex flex-col w-fit gap-2"}>
                <button
                    type={"button"}
                    onClick={onAcceptClicked}
                    className={
                        "rounded-md border hover:bg-gray-100 cursor-pointer"
                    }
                >
                    accept
                </button>
                <StudentsList students={candidates} />
            </div>
        </div>
    )
}

interface TeacherListProps {
    teachers: ITeacher[]
    selectedTeacherId: TeacherId | null
    onTeacherSelected: (id: TeacherId | null) => void
    school: School
    candidateStudents: StudentId[]
}

function TeacherList({
    teachers,
    selectedTeacherId,
    onTeacherSelected,
    school,
    candidateStudents,
}: TeacherListProps) {
    const teachersSortedByNeighbourCount = teachers.toSorted(
        (a, b) => a.neighbours.length - b.neighbours.length,
    )

    return (
        <dl className={"flex flex-col w-fit"}>
            {teachersSortedByNeighbourCount.map(teacher => {
                const bgClass =
                    selectedTeacherId === teacher.id
                        ? "bg-emerald-200"
                        : teacher?.neighbours.some(
                                t => t.id === selectedTeacherId,
                            )
                          ? "bg-amber-100"
                          : "odd:bg-gray-100"

                const candiatesIfSelected = intersection(
                    candidateStudents,
                    teacher.students.map(getId),
                )

                return (
                    <div
                        key={teacher.id}
                        onClick={() => onTeacherSelected(teacher.id)}
                        className={`grid grid-cols-5 gap-8 px-2 ${bgClass}`}
                    >
                        <dt className={"col-span-4"}>{teacher.id}</dt>
                        <dd>{candiatesIfSelected.length}</dd>
                    </div>
                )
            })}
        </dl>
    )
}

interface StudentsListProps {
    students: StudentId[]
}

function StudentsList({ students }: StudentsListProps) {
    return (
        <ul className={"flex flex-col w-fit"}>
            {students.map(student => {
                return (
                    <div
                        key={student}
                        className={`px-2  bg-blue-50 odd:bg-blue-100 text-gray-500`}
                    >
                        <li className={"col-span-4"}>{student}</li>
                    </div>
                )
            })}
        </ul>
    )
}

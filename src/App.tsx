import { type ChangeEvent, useEffect, useState } from "react"
import { parseStudentWorkbook } from "./lib/parseStudentsWorkbook.ts"
import { useLocalStorage } from "./lib/useLocalStorage.ts"
import { School } from "./lib/school.ts"
import Workspace from "./workspace/Workspace.tsx"
import { useDebugLog } from "./lib/useDebugLog.ts"
import type { StudentId } from "./lib/studentId.ts"
import type { TeacherId } from "./lib/teacherId.ts"
import type { Group } from "./lib/group.ts"
import Results from "./workspace/Results.tsx"
import { createGroupings } from "./lib/createGroupings.ts"

export default function App() {
    const [groupings, setGroupings] = useLocalStorage<Group[]>("groupings", {
        defaultValue: [],
    })
    const [schoolStack, setSchoolStack] = useLocalStorage<School[]>("school", {
        defaultValue: [],
        serialization: {
            serialize: School.serialize,
            deserialize: School.deserialize,
        },
    })

    const school = schoolStack.at(-1)
    const mainSchool = schoolStack.at(0)

    const [selectedTeacher, setSelectedTeacher] = useState<TeacherId>()
    const [selectedStudent, setSelectedStudent] = useState<StudentId>()

    useDebugLog({ schoolStack, school })

    async function onFileSelected(event: ChangeEvent) {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) return
        const { pairings } = parseStudentWorkbook(await file.arrayBuffer())
        setSchoolStack([School.create(pairings)])
        setGroupings([])
    }

    function resolveGrouping(teachers: TeacherId[], students: StudentId[]) {
        setGroupings([...groupings, [...teachers, ...students]])

        setSchoolStack([
            ...schoolStack,
            ...(school ? [school.without({ teachers, students })] : []),
        ])
    }

    useEffect(() => {
        if (!school) return
        setGroupings(createGroupings(school, { teachersPerGroup: 4 }))
    }, [school])

    async function deleteGroup(idx: number) {
        setGroupings(groupings.toSpliced(idx, 1))
    }

    const numStudents = mainSchool?.getStudentIds().size ?? 0
    const numTeachers = mainSchool?.getTeachers().length ?? 0
    const inTotal = numStudents + numTeachers
    const studentsPerTeacher = numStudents / numTeachers

    const [targetTeacherCount, setTargetTeacherCount] = useState(4)
    const idealGroupSize =
        (numStudents + numTeachers) / (numTeachers / targetTeacherCount)
    return (
        <div className="flex flex-col gap-2">
            <div className={"flex flex-row gap-4"}>
                <input
                    className={"cursor-pointer"}
                    type="file"
                    onChange={onFileSelected}
                />

                <dl className={"flex flex-row gap-2"}>
                    <dt>teachers:</dt>
                    <dd>{numTeachers}</dd>
                    <dt>students:</dt>
                    <dd>{numStudents}</dd>
                    <dt>students per teacher:</dt>
                    <dd>{studentsPerTeacher.toFixed(2)}</dd>
                    <dt>in total</dt>
                    <dd>{inTotal}</dd>
                    <dt className={"flex flex-row"}>
                        ideal group size with{" "}
                        <input
                            className={"inline w-10 ml-1"}
                            type={"number"}
                            value={targetTeacherCount}
                            onChange={ev =>
                                setTargetTeacherCount(Number(ev.target.value))
                            }
                        />{" "}
                        teachers:
                    </dt>
                    <dd>{idealGroupSize.toFixed(2)}</dd>
                </dl>
            </div>

            <div className={"flex flex-row gap-8"}>
                {school && (
                    <Workspace
                        school={school}
                        createGrouping={resolveGrouping}
                    />
                )}

                {mainSchool && (
                    <Results
                        groupings={groupings}
                        deleteGroup={deleteGroup}
                        selectedStudent={selectedStudent ?? null}
                        selectedTeacher={selectedTeacher ?? null}
                        school={mainSchool}
                        selectStudent={s => setSelectedStudent(s ?? undefined)}
                        selectTeacher={t => setSelectedTeacher(t ?? undefined)}
                    />
                )}
            </div>
        </div>
    )
}

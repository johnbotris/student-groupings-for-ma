import { type ChangeEvent, useState } from "react"
import { parseStudentWorkbook } from "./lib/parseStudentsWorkbook.ts"
import { useLocalStorage } from "./lib/useLocalStorage.ts"
import { School } from "./lib/school.ts"
import Workspace from "./workspace/Workspace.tsx"
import { useDebugLog } from "./lib/useDebugLog.ts"
import type { StudentId } from "./lib/studentId.ts"
import type { TeacherId } from "./lib/teacherId.ts"
import type { Group } from "./lib/group.ts"
import Results from "./workspace/Results.tsx"

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

    function createGroupings(teachers: TeacherId[], students: StudentId[]) {
        setGroupings([...groupings, [...teachers, ...students]])

        setSchoolStack([
            ...schoolStack,
            ...(school ? [school.without({ teachers, students })] : []),
        ])
    }

    async function deleteGroup(idx: number) {
        setGroupings(groupings.toSpliced(idx, 1))
    }

    return (
        <div className="flex flex-col gap-2">
            <input
                className={"cursor-pointer"}
                type="file"
                onChange={onFileSelected}
            />

            <div className={"flex flex-row gap-8"}>
                {school && (
                    <Workspace
                        school={school}
                        createGrouping={createGroupings}
                    />
                )}

                {mainSchool && (
                    <Results
                        groupings={groupings}
                        deleteGroup={deleteGroup}
                        selectedStudent={selectedStudent ?? null}
                        selectedTeacher={selectedTeacher ?? null}
                        school={mainSchool}
                        selectStudent={s => setSelectedStudent(s ?? null)}
                        selectTeacher={t => setSelectedTeacher(t ?? null)}
                    />
                )}
            </div>
        </div>
    )
}

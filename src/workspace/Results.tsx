import type { Group } from "../lib/group.ts"
import type { StudentId } from "../lib/studentId.ts"
import type { TeacherId } from "../lib/teacherId.ts"
import type { School } from "../lib/school.ts"
import { intersection } from "../lib/intersection.ts"
import { useDebugLog } from "../lib/useDebugLog.ts"

interface ResultsProps {
    groupings: Group[]
    deleteGroup: (idx: number) => void
    selectedStudent: StudentId | null
    selectedTeacher: TeacherId | null
    selectStudent: (id: StudentId | null) => void
    selectTeacher: (id: TeacherId | null) => void
    school: School
}

export default function Results({
    groupings,
    deleteGroup,
    selectedStudent,
    selectedTeacher,
    selectTeacher,
    selectStudent,
    school,
}: ResultsProps) {
    return (
        <ul className={"text-sm  flex flex-col flex-wrap max-h-sm gap-0.5"}>
            {groupings.map(g => {
                const numPossibleCandidates = 0

                return (
                    <div className={"flex flex-row items-center"}>
                        <span>{numPossibleCandidates}</span>
                        <li key={g.join(", ")} className={"px-1 py-2 "}>
                            <ul className={"flex flex-row flex-wrap gap-2"}>
                                {g.map(member => {
                                    const selected =
                                        member === selectedStudent ||
                                        member === selectedTeacher

                                    const onSelect = () => {
                                        if (school.isStudent(member)) {
                                            if (member === selectedStudent) {
                                                selectStudent(null)
                                            } else {
                                                selectStudent(member)
                                            }
                                        } else if (school.isTeacher(member)) {
                                            if (member === selectedTeacher) {
                                                selectTeacher(null)
                                            } else {
                                                selectTeacher(member)
                                            }
                                        }
                                    }
                                    const selectedClass = school.isStudent(
                                        member,
                                    )
                                        ? "bg-green-100"
                                        : "bg-yellow-100"

                                    const unselectedClass = school.isStudent(
                                        member,
                                    )
                                        ? "bg-green-50"
                                        : "bg-yellow-50"
                                    const bgClass = selected
                                        ? selectedClass
                                        : unselectedClass

                                    return (
                                        <li
                                            onClick={onSelect}
                                            className={` cursor-pointer p-1 flex flex-row gap-1 text-xs ${bgClass}`}
                                        >
                                            <span>{member}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                        </li>
                    </div>
                )
            })}
        </ul>
    )
}

import type { School } from "./school.ts"

export class Stats {
    private school: School

    constructor(school: School) {
        this.school = school
    }
}

import { Relation } from './relation'
import Knex from 'knex'
import { DBRow } from '../repo'

export class BelongsToMany extends Relation {

    query(query: Knex.QueryBuilder) {
        const whereIds = this.result.map(item => item[this.getLocalKey()])
        const relatedTable = this.relatedModelMeta().table

        query.leftJoin(
            this.getJoinTable(),
            `${this.getJoinTable()}.${this.getForeignJoin()}`,
            `${relatedTable}.${this.getForeignKey()}`
        )
        query.whereIn(`${this.getJoinTable()}.${this.getLocalJoin()}`, whereIds)
    }

    async appendResult(relatedResult: DBRow[]): Promise<any> {
        const foreignKey = this.getLocalJoin()
        const localKey = this.getLocalKey()

        this.result.forEach(item => {
            const relationSet = relatedResult.filter(relatedItem => {
                return item[localKey] === relatedItem[foreignKey]
            })

            item[this.meta.as] = this.repo.format(relationSet)
        })
    }

    async sync(db, id: string, ids: string[]) {
        const joinTable = this.getJoinTable()
        const localJoin = this.getLocalJoin()
        const foreignJoin = this.getForeignJoin()

        // Check existing relations in table
        let existing = await db(this.getJoinTable()).where(this.getLocalJoin(), id) || []
        existing = existing.map((i) => i[this.getForeignJoin()])

        // Filter record to delete
        const toDelete = existing.filter((i) => {
            return ids.indexOf(i) < 0
        })

        // Filter record to create
        const toCreate = ids.filter((i) => {
            return existing.indexOf(i) < 0
        })

        // Deleting unused
        for (const idToDelete of toDelete) {
            await db(joinTable)
                .where(localJoin, id)
                .where(foreignJoin, idToDelete)
                .delete()
        }

        // Creating new relations
        for (const el of toCreate) {
            const field = typeof el === 'string' ? {id: el} : el

            let other = {}

            Object.keys(field).filter(key => key !== 'id').forEach(key => {
                other[key] = field[key]
            })

            await db(joinTable).insert({
                [localJoin]: id,
                [foreignJoin]: field.id,
                ...other
            })
        }
    }

    private getLocalJoin(): string {
        if (this.meta.localJoin) {
            return this.meta.localJoin
        }

        return this.parentIdentifier()
    }

    private getForeignJoin() {
        if (this.meta.foreignJoin) {
            return this.meta.foreignJoin
        }

        return this.relatedIdentifier()
    }

    private getJoinTable(): string {
        if (this.meta.joinTable) {
            return this.meta.joinTable
        }

        const tables = [this.meta.class.toLowerCase(), this.meta.model().name.toLowerCase()]
        return tables.sort().join('_')
    }

    private getLocalKey() {
        return this.meta.localKey
            ? this.meta.localKey
            : 'id'
    }

    private getForeignKey() {
        return this.meta.foreignKey
            ? this.meta.foreignKey
            : 'id'
    }
}

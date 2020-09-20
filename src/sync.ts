import Knex from 'knex'
import { RelationMetadataArgs } from "./metadata/metadata-storage"

/**
 * Sync handles the many-to-many relation table syncing
 *
 * @param db
 * @param relationData
 * @param id
 * @param ids
 */
export  async function sync(db: Knex, relationData: RelationMetadataArgs, id: string, ids: string[]) {
    const {
        joinTable,
        localJoin,
        foreignJoin
    } = relationData

    // Check existing relations in table
    let existing = await db(joinTable).where(localJoin, id) || []
    existing = existing.map((i) => i[foreignJoin])

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

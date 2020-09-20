import assert = require('assert')
import { app, container } from '@dynejs/core'
import { Connection, DatabaseModule, Migrator } from '../src'
import { photo } from './models/photo'
import { post } from './models/post'
import { category } from './models/category'
import { address } from './models/address'
import { user } from './models/user'

let db = null
let userId = null

async function createPosts() {
    await db('posts').truncate()
    await db('categories').truncate()
    await db('category_post').truncate()

    const categoryId1 = await category().create({
        title: 'Category one'
    })

    const categoryId2 = await category().create({
        title: 'Category two'
    })

    const postId1 = await post().create({
        title: 'First post',
        content: 'First post content',
        author_id: userId
    })

    const postId2 = await post().create({
        title: 'Second post',
        content: 'Second post content',
        author_id: userId
    })

    await post().sync('categories', postId1, [categoryId1, categoryId2])
    await post().sync('categories', postId2, [categoryId2])
}

before(async () => {
    app([
        DatabaseModule
    ], process.cwd() + '/test')

    const cn = container().resolve(Connection)
    db = cn.active()

    await db('users').truncate()
    await db('addresses').truncate()

    await db('categories').truncate()

    userId = await user().create({
        name: 'Test User',
        email: 'john@doe.com'
    })

    await address().create({
        user_id: userId,
        address: 'Middle of Nowhere 211'
    })

    await createPosts()
})

describe('Migrator', () => {
    it('should add dir to migration dirs', function () {
        const migrator = container().resolve(Migrator)
        migrator.addDir(__dirname + '/migrations')
        assert(migrator.dirs.length > 0)
    })
})

describe('Query', () => {

    it('should format output data', async () => {
        const res = await post().find()
        assert(res.metadata === 'METADATA')
    })

    it('should transform input data', async () => {
        const id = await post().create({
            title: 'Hello world',
            content: 'Not formatted'
        })

        const p = await post().where('id', id).find()

        assert(p.content === 'Formatted')
    })

    it('should change query on model', async () => {
        const res = await post().where('title', 'First post').get()
        assert(res[0].title === 'First post')
        assert(res.length === 1)
    })

    it('should set default query', async () => {
        const res = await post().orderBy('title', 'desc').get()
        assert(res[0].title === 'Second post')
    })

    it('should update a record', async () => {
        const addr = await address().find()
        await address().where('id', addr.id).update({
            address: 'Changed address'
        })

        const res = await address().find()
        assert(res.address === 'Changed address')
    })

    it('should delete a record', async () => {
        const p = await post().find()

        await post().where('id', p.id).destroy()

        const res = await post().where('id', p.id).find()
        assert(!res)
    })

    it('should give paginated result', async () => {
        // Rest posts db
        await createPosts()

        const res = await post().paginate(1, 0)
        assert(res.current === 1)
        assert(res.pages === 2)
        assert(res.total === 2)
        assert(res.data[0].title === 'First post')
    })

    it('should order items', async () => {
        await db('photo').truncate()

        const itemId1 = await photo().create({
            title: 'First',
            order: 0
        })

        const itemId2 = await photo().create({
            title: 'Second',
            order: 1
        })

        const itemId3 = await photo().create({
            title: 'Third',
            order: 2
        });

        ([itemId3, itemId2, itemId1]).map(async (id: string, ndx: number) => {
            await photo().where('id', id).update({order: ndx})
        })

        const res = await photo().orderBy('order', 'asc').get()

        assert(res[0].title === 'Third')
        assert(res[0].order === 0)
        assert(res[1].title === 'Second')
        assert(res[1].order === 1)
        assert(res[2].title === 'First')
        assert(res[2].order === 2)
    })
})

describe('Query relations', () => {
    it('should give belongsToMany relations', async () => {
        const res = await post().find()

        assert(Array.isArray(res.categories))
        assert(res.categories.length > 0)
        assert(res.categories[0].title !== '')
    })

    it('should give hasOne relations', async () => {
        const res = await user().with(['address']).find()
        assert(res.address.id !== '')
        assert(res.address.address !== '')
    })

    it('should give hasOne relations with other table', async () => {
        const res = await post().with(['author']).find()
        assert(res.author.name === 'Test User')
    })

    it('should give sync relations', async () => {
        const categories = await category().get()
        const categoryIds = categories.map(c => c.id)
        const p = await post().find()

        await db('category_post').truncate()

        await post().sync('categories', p.id, categoryIds)
        const res = await post().where('id', p.id).find()

        assert(res.categories.length > 0)
    })

    // it('should give belongsTo relations', async () => {
    //     const res = await address().with(['user']).find()
    //     assert(res.user.name === 'Test User')
    // })

    it('should give results with whereExists', async () => {
        await createPosts()

        const res = await post().whereExists((db) => {
            return db('categories')
                .where('title', 'Category one')
                .leftJoin('category_post', 'category_post.category_id', 'categories.id')
                .whereRaw('category_post.post_id = posts.id')
        }).get()

        assert(res.length === 1)
        assert(res[0].title === 'First post')
    })
})

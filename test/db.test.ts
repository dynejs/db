import assert = require('assert')
import { app, container } from '@dynejs/core'
import { Connection, DatabaseModule, Migrator, Repo } from '../src'
import { Photo } from './models/photo'
import { Post } from './models/post'
import { Category } from './models/category'
import { Address } from './models/address'
import { User } from './models/user'
import { Comment } from './models/comment'

let db = null
let userId = null

async function createPosts() {
    await db('posts').truncate()
    await db('categories').truncate()
    await db('category_post').truncate()
    await db('comments').truncate()

    const categoryId1 = await Repo.create(Category, {
        title: 'Category one'
    })

    const categoryId2 = await Repo.create(Category, {
        title: 'Category two'
    })

    const postId1 = await Repo.create(Post, {
        title: 'First post',
        content: 'First post content',
        author_id: userId
    })

    const postId2 = await Repo.create(Post, {
        title: 'Second post',
        content: 'Second post content',
        author_id: userId
    })

    const commentId1 = await Repo.create(Comment, {
        comment: 'First comment',
        post_id: postId1
    })

    const commentId2 = await Repo.create(Comment, {
        comment: 'Second comment',
        post_id: postId1
    })

    await db('category_post').insert({
        post_id: postId1,
        category_id: categoryId1
    })

    await db('category_post').insert({
        post_id: postId1,
        category_id: categoryId2
    })

    await db('category_post').insert({
        post_id: postId2,
        category_id: categoryId2
    })
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

    userId = await Repo.create(User, {
        name: 'Test User',
        email: 'john@doe.com'
    })

    await Repo.create(Address, {
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
        const res = await Repo.find(Post)
        assert(res.metadata === 'METADATA')
    })

    it('should transform input data', async () => {
        const id = await Repo.create(Post, {
            title: 'Hello world',
            content: 'Not formatted'
        })

        const p = await Repo.find(Post, { id })

        assert(p.content === 'Formatted')
    })

    it('should change query on model', async () => {
        const res = await Repo.get(Post, {
            title: 'First post'
        })
        assert(res[0].title === 'First post')
        assert(res.length === 1)
    })

    it('should set default query', async () => {
        const res = await Repo.get(Post, query => query.orderBy('title', 'desc'))
        assert(res[0].title === 'Second post')
    })

    it('should update a record', async () => {
        const addr = await Repo.find(Address)
        await Repo.update(Address, { id: addr.id }, {
            address: 'Changed address'
        })

        const res = await Repo.find(Address)
        assert(res.address === 'Changed address')
    })

    it('should delete a record', async () => {
        const p = await Repo.find(Post)

        await Repo.destroy(Post, {
            id: p.id
        })

        const res = await Repo.find(Post, { id: p.id })
        assert(!res)
    })

    it.only('should give paginated result', async () => {
        // Rest posts db
        await createPosts()

        const res = await Repo.paginate(Post, 1, 0, query => query.orderBy('title', 'desc'))
        console.log(res)
        assert(res.current === 1)
        assert(res.pages === 2)
        assert(res.total === 2)
        assert(res.data[0].title === 'First post')
    })

    it('should order items', async () => {
        await db('photo').truncate()

        const itemId1 = await Repo.create(Photo, {
            title: 'First',
            order: 0
        })

        const itemId2 = await Repo.create(Photo, {
            title: 'Second',
            order: 1
        })

        const itemId3 = await Repo.create(Photo, {
            title: 'Third',
            order: 2
        });

        ([itemId3, itemId2, itemId1]).map(async (id: string, ndx: number) => {
            await Repo.update(Photo, { id }, { order: ndx })
        })

        const res = await Repo.get(Photo, query => query.orderBy('order', 'asc'))

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
        const res = await Repo.find(Post, null, ['categories'])

        assert(Array.isArray(res.categories))
        assert(res.categories.length > 0)
        assert(res.categories[0].title !== '')
    })

    it('should give hasOne relations', async () => {
        const res = await Repo.find(User, null, ['address'])
        assert(res.address.id !== '')
        assert(res.address.address !== '')
    })

    it('should give has many relations', async () => {
        const res = await Repo.find(Post, null, ['comments'])
        assert(res.comments[0].comment !== '')
    })

    it('should give hasOne relations with other table', async () => {
        const res = await Repo.find(User, null, ['address'])
        assert(res.address.address !== '')
    })

    it('should test belongsTo relations with other table', async () => {
        const res = await Repo.find(Address, null, ['user'])
        assert(res.user.name === 'Test User')
    })

    it('should give sync relations', async () => {
        const categories = await Repo.get(Category)
        const categoryIds = categories.map(c => c.id)
        const p = await Repo.find(Post)

        await db('category_post').truncate()

        await Repo.sync(Post, 'categories', p.id, categoryIds)
        const res = await Repo.find(Post, { id: p.id })

        assert(res.categories.length > 0)
    })

    it('should give belongsTo relations', async () => {
        const res = await Repo.find(Address, null, ['user'])
        assert(res.user.name === 'Test User')
    })

    it('should give results with whereExists', async () => {
        await createPosts()

        const res = await Repo.get(Post, (query, db) => {
            const select = db('categories')
                .where('title', 'Category one')
                .leftJoin('category_post', 'category_post.category_id', 'categories.id')
                .whereRaw('category_post.post_id = posts.id')

            query.whereExists(select)
        })

        assert(res.length === 1)
        assert(res[0].title === 'First post')
    })
})

'use strict'

async function up(db) {
    await db.schema.createTable('posts', function(table) {
        table.uuid('id').primary()
        table.string('title')
        table.string('metadata')
        table.boolean('published').default(false)
        table.text('content')
        table.uuid('author_id').index()
        table.timestamps()
    })

    await db.schema.createTable('users', function(table) {
        table.uuid('id').primary()
        table.string('name')
        table.string('email')
        table.timestamps()
    })

    await db.schema.createTable('addresses', function(table) {
        table.uuid('id').primary()
        table.string('user_id')
        table.text('address')
        table.timestamps()
    })

    await db.schema.createTable('categories', function(table) {
        table.uuid('id').primary()
        table.string('title')
        table.timestamps()
    })

    await db.schema.createTable('category_post', function(table) {
        table.uuid('category_id').index()
        table.uuid('post_id').index()
        table.timestamps()
    })

    await db.schema.createTable('photo', function(table) {
        table.uuid('id').primary()
        table.string('title').index()
        table.integer('order').default(0)
        table.string('related_id').index()
        table.string('related_type').index()
        table.timestamps()
    })
}

async function down(db) {
    db.schema.dropTable('posts')
    db.schema.dropTable('users')
    db.schema.dropTable('addresses')
    db.schema.dropTable('categories')
    db.schema.dropTable('categories_posts')
    db.schema.dropTable('items')
}

module.exports = {
    up,
    down
}

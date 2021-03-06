import { BelongsTo, BelongsToMany, Field, HasMany, HasOne, Model, Repo } from '../../src'
import { Category } from './category'
import { Photo } from './photo'
import { User } from './user'
import { Comment } from './comment'
import { validate } from '@dynejs/core'

@Model({
    table: 'posts',
    with: ['categories', 'comments']
})
export class Post {

    @Field()
    id: string

    @Field()
    title: string

    @BelongsTo(() => User, {
        localKey: 'author_id',
    })
    @Field()
    author: User

    @BelongsToMany(() => Category)
    @Field()
    categories: Category[]

    @Field()
    content: string

    @HasOne(() => Photo, {
        foreignKey: 'related_id',
        query: q => q.where('related_type', 'category')
    })
    @Field()
    photo: Photo

    @HasMany(() => Comment)
    @Field()
    comments: Comment[]

    @Field({
        cast: 'boolean'
    })
    published: boolean

    author_id: string

    @Field()
    metadata: string

    static make(data) {
        const p = Repo.cast(Post, data)
        validate(p, {
            title: 'required'
        })
    }

    format() {
        this.metadata = 'METADATA'
    }

    transform() {
        this.content = 'Formatted'
    }
}

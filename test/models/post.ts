import { Model, Field, Relation, Repo } from '../../src'
import { Category } from './category'
import { Photo } from './photo'
import { User } from './user'
import { HasFormatter, HasTransformer } from '../../src/common'

@Model({
    table: 'posts'
})
export class Post implements HasFormatter, HasTransformer {

    @Field()
    id: string

    @Field()
    title: string

    @Relation({
        model: User,
        localKey: 'author_id',
        foreignKey: 'id',
        single: true
    })
    @Field()
    author: User

    @Relation({
        model: Category,
        localKey: 'id',
        localJoin: 'post_id',
        foreignKey: 'id',
        foreignJoin: 'category_id',
        joinTable: 'category_post',
        single: false
    })
    @Field()
    categories: Category[]

    @Field()
    content: string

    @Relation({
        model: Photo,
        localKey: 'id',
        foreignKey: 'related_id',
        single: true,
        query: q => q.where('related_type', 'category')
    })
    @Field()
    photo: Photo

    @Field({
        cast: 'boolean'
    })
    published: boolean

    author_id: string

    metadata: string

    format() {
        this.metadata = 'METADATA'
    }

    transform() {
        this.content = 'Formatted'
    }
}

export const post = () => new Repo(Post)

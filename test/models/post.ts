import { BelongsTo, BelongsToMany, Field, HasMany, HasOne, Model, Repo } from '../../src'
import { Category } from './category'
import { Photo } from './photo'
import { User } from './user'
import { HasFormatter, HasTransformer } from '../../src/common'
import { Comment } from './comment'

@Model({
    table: 'posts'
})
export class Post implements HasFormatter, HasTransformer {

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

    metadata: string

    format() {
        this.metadata = 'METADATA'
    }

    transform() {
        this.content = 'Formatted'
    }
}

export const post = () => new Repo(Post)

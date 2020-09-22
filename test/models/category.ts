import { Model, Field, Relation, Repo, HasOne } from '../../src'
import { Photo } from './photo'

@Model({
    table: 'categories',
    with: []
})
export class Category {
    @Field()
    id: string

    @Field()
    title: string

    @Field()
    @HasOne(() => Photo, {
        foreignKey: 'related_id',
    })
    photo: Photo
}

export const category = () => new Repo(Category)

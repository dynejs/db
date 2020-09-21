import { Model, Field, Relation, Repo } from '../../src'
import { Photo } from './photo'

@Model({
    table: 'categories',
    with: ['photo']
})
export class Category {
    @Field()
    id: string

    @Field()
    title: string

    @Field()
    @Relation({
        model: () => Photo,
        localKey: 'id',
        foreignKey: 'related_id',
        single: true
    })
    photo: Photo
}

export const category = () => new Repo(Category)

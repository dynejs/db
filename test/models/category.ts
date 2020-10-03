import { Field, HasOne, Model } from '../../src'
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

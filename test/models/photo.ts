import { Model, Field, Repo } from '../../src'

@Model({
    table: 'photo'
})
export class Photo {

    @Field()
    title: string

    @Field()
    order: number

    related_id: string

    related_type: string
}

export const photo = () => new Repo(Photo)

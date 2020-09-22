import { Field, Model, Repo } from '../../src'

@Model({
    table: 'comments'
})
export class Comment {
    @Field()
    id: string

    @Field()
    comment: string

    post_id: string
}

export const comment = () => new Repo(Comment)

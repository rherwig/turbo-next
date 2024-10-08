import { charactersService } from '@tekken-space/database'
import { upsertCharacterSchema } from '@tekken-space/types'
import { validateRequest } from '@/lib/auth'
import { isAdmin } from '@/lib/utils/auth'

export async function GET() {
    const characters = await charactersService.findAll()

    return Response.json(characters)
}

export async function PUT(request: Request) {
    const { user } = await validateRequest()
    if (!user) {
        return new Response(null, {
            status: 401,
        })
    }

    if (!isAdmin(user)) {
        return new Response(null, {
            status: 403,
        })
    }

    const body = await request.json()
    const validation = upsertCharacterSchema.safeParse(body)
    if (validation.error) {
        console.log(validation.error)
        return new Response(null, {
            status: 400,
        })
    }

    const result = await charactersService.upsert(validation.data)

    return Response.json(result)
}

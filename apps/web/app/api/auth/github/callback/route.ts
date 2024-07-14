import { gitHub, lucia } from '@/lib/auth'
import { db, sql, users } from '@tekken-space/database'
import { cookies } from 'next/headers'
import { OAuth2RequestError } from 'arctic'
import { generateId } from 'lucia'

interface GitHubUser {
    id: string
    login: string
    email: string
    avatar_url: string
}

export async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = cookies().get('github_oauth_state')?.value ?? null

    if (!code || !state || !storedState || state !== storedState) {
        return new Response(null, {
            status: 400,
        })
    }

    try {
        const tokens = await gitHub.validateAuthorizationCode(code)

        const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        })
        const githubUser: GitHubUser = await githubUserResponse.json()

        const existingUser = await db
            .select()
            .from(users)
            .where(sql`github_id=${githubUser.id}`)

        if (existingUser[0]) {
            const session = await lucia.createSession(existingUser[0].id, {})
            const sessionCookie = lucia.createSessionCookie(session.id)
            cookies().set(
                sessionCookie.name,
                sessionCookie.value,
                sessionCookie.attributes,
            )
            return new Response(null, {
                status: 302,
                headers: {
                    Location: '/',
                },
            })
        }

        const userId = generateId(15)

        await db.insert(users).values({
            id: userId,
            gitHubId: githubUser.id,
            name: githubUser.login,
            email: githubUser.email,
            image: githubUser.avatar_url,
        })

        const session = await lucia.createSession(userId, {})
        const sessionCookie = lucia.createSessionCookie(session.id)
        cookies().set(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes,
        )

        return new Response(null, {
            status: 302,
            headers: {
                Location: '/',
            },
        })
    } catch (e) {
        if (e instanceof OAuth2RequestError) {
            return new Response(null, {
                status: 400,
            })
        }
        return new Response(null, {
            status: 500,
        })
    }
}

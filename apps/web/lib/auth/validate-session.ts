import { cookies } from 'next/headers'
import { cache } from 'react'
import { Profile, Session } from '@tekken-space/database'

import { lucia } from '.'

export const validateRequest = cache(
    async (): Promise<
        { user: Profile; session: Session } | { user: null; session: null }
    > => {
        const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null

        if (!sessionId) {
            return {
                session: null,
                user: null,
            }
        }

        const result = await lucia.validateSession(sessionId)
        try {
            if (result.session && result.session.fresh) {
                const sessionCookie = lucia.createSessionCookie(
                    result.session.id,
                )
                cookies().set(
                    sessionCookie.name,
                    sessionCookie.value,
                    sessionCookie.attributes,
                )
            }
            // FIXME: Find out why this errors on request.
            // if (!result.session) {
            //     const sessionCookie = lucia.createBlankSessionCookie()
            //     cookies().set(
            //         sessionCookie.name,
            //         sessionCookie.value,
            //         sessionCookie.attributes,
            //     )
            // }
        } catch (error: unknown) {
            console.error(error)
        }

        return result
    },
)

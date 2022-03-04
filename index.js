/**
 * Shows how to restrict access using the HTTP Basic schema.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
 * @see https://tools.ietf.org/html/rfc7617
 *
 * A user-id containing a colon (":") character is invalid, as the
 * first colon in a user-pass string separates user and password.
 */

/**
 * Receives a HTTP request and replies with a response.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
    const { pathname, protocol } = new URL(request.url);
    if ('https:' !== protocol || 'https' !== request.headers.get('x-forwarded-proto')) {
        throw new BadRequestException('Please use a HTTPS connection.');
    }

    switch (pathname) {
        case '/modify': {
            if (request.headers.has('Authorization')) {
                if (request.method === "POST") {
                    const { user, pass } = basicAuthentication(request);
                    verifyCredentials(user, pass);

                    resp = await request.json();
                    for (const [key, value] of Object.entries(resp)) {
                        await KV.put(key, JSON.stringify(value));
                    }
                    response = {
                        status: 200,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "POST"
                        },
                    }
                    response = new Response("Modified.", response)
                    return response
                }

                return new Response('POST method only.', {
                    status: 405,
                    headers: {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "POST"
                    },
                });
            }

            return new Response('Authorization needed.', {
                status: 401,
                headers: {
                    'WWW-Authenticate': 'Basic realm="my scope", charset="UTF-8"',
                },
            });
        }

        case '/favicon.ico':
        case '/robots.txt':
            return new Response(null, { status: 204 });

        default:
            switch (pathname.split('/')[1]) {
                case 'a': {
                    if (request.method === "GET") {
                        const key = pathname.split('/')[2];
                        let value = await KV.get(key);
                        response = {
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "GET",
                                "Content-Type": "application/json",
                                'Cache-Control': 'no-store',
                                'Content-Length': value.length,
                            },
                            status: 200,
                        }

                        response = new Response(value, response);
                        return response
                    }

                    return new Response('GET method only.', {
                        status: 405,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET"
                        },
                    });
                }

                default:
                    return new Response('Not found.', {
                        status: 404,
                    });
            }
    }
}

/**
 * Throws exception on verification failure.
 * @param {string} user
 * @param {string} pass
 * @throws {UnauthorizedException}
 */
function verifyCredentials(user, pass) {
    if (USER !== user) {
        throw new UnauthorizedException('Invalid username.');
    }

    if (PASS !== pass) {
        throw new UnauthorizedException('Invalid password.');
    }
}

/**
 * Parse HTTP Basic Authorization value.
 * @param {Request} request
 * @throws {BadRequestException}
 * @returns {{ user: string, pass: string }}
 */
function basicAuthentication(request) {
    const Authorization = request.headers.get('Authorization');

    const [scheme, encoded] = Authorization.split(' ');

    // The Authorization header must start with Basic, followed by a space.
    if (!encoded || scheme !== 'Basic') {
        throw new BadRequestException('Malformed authorization header.');
    }

    // Decodes the base64 value and performs unicode normalization.
    // @see https://datatracker.ietf.org/doc/html/rfc7613#section-3.3.2 (and #section-4.2.2)
    // @see https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
    const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(buffer).normalize();

    // The username & password are split by the first colon.
    //=> example: "username:password"
    const index = decoded.indexOf(':');

    // The user & password are split by the first colon and MUST NOT contain control characters.
    // @see https://tools.ietf.org/html/rfc5234#appendix-B.1 (=> "CTL = %x00-1F / %x7F")
    if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
        throw new BadRequestException('Invalid authorization value.');
    }

    return {
        user: decoded.substring(0, index),
        pass: decoded.substring(index + 1),
    };
}

function UnauthorizedException(reason) {
    this.status = 401;
    this.statusText = 'Unauthorized';
    this.reason = reason;
}

function BadRequestException(reason) {
    this.status = 400;
    this.statusText = 'Bad Request';
    this.reason = reason;
}

addEventListener('fetch', event => {
    event.respondWith(
        handleRequest(event.request).catch(err => {
            const message = err.reason || err.stack || 'Unknown Error';

            return new Response(message, {
                status: err.status || 500,
                statusText: err.statusText || null,
                headers: {
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'Cache-Control': 'no-store',
                    'Content-Length': message.length,
                },
            });
        })
    );
});
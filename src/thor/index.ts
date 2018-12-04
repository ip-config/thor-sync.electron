import { createAccountVisitor } from './account-visitor'
import { createBlockVisitor } from './block-visitor'
import { createTxVisitor } from './tx-visitor'
import { createFilter } from './filter'
import { Site } from './site'

export function create(
    site: Site
): Connex.Thor {
    const wire = site.createWire()
    return {
        get genesis() { return site.config.genesis },
        get status() { return site.status },
        ticker: () => {
            let lastKnownBlockNum = site.status.head.number
            return {
                next: async () => {
                    if (lastKnownBlockNum !== site.status.head.number) {
                        lastKnownBlockNum = site.status.head.number
                        return
                    }
                    await site.nextTick()
                    lastKnownBlockNum = site.status.head.number
                }
            }
        },
        account: (addr) => {
            return createAccountVisitor(wire, addr)
        },
        block: revision => {
            return createBlockVisitor(wire, revision)
        },
        transaction: (id) => {
            return createTxVisitor(wire, id)
        },
        filter: kind => {
            return createFilter(wire, kind)
        },
        explain: () => {
            const opts: {
                caller?: string
                gas?: number
                gasPrice?: string
            } = {}
            let revision: string | number | undefined
            return {
                caller(addr) {
                    opts.caller = addr
                    return this
                },
                gas(gas) {
                    opts.gas = gas
                    return this
                },
                gasPrice(gp) {
                    opts.gasPrice = gp
                    return this
                },
                revision(rev) {
                    revision = rev
                    return this
                },
                execute(clauses) {
                    const body = {
                        clauses: clauses.map(c => ({
                            to: c.to,
                            value: c.value.toString(),
                            data: c.data
                        })),
                        ...opts
                    }
                    return wire.post<Connex.Thor.VMOutput[]>(
                        `accounts/*`,
                        body,
                        { revision })
                }
            }
        }
    }
}

export * from './site'

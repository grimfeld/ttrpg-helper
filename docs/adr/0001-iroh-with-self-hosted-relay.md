# Peer-to-peer sync over iroh, with our own relay

The GM app and the player apps sync a session over [iroh](https://www.iroh.computer/): direct, end-to-end encrypted QUIC connections between devices. When a direct connection can't be made (NAT, firewalls), iroh routes traffic through a relay server. We run our own relay instead of using the public ones.

We chose peer to peer because session data must never be published on the internet or stored by a service, and because there must be no server to pay for that grows with use. A relay doesn't break either rule: it forwards encrypted packets it can't read, stores nothing, and costs one small instance whatever the number of sessions.

## Consequences

- "No server" means no server that stores, reads or processes session data. The relay is the one exception, and it only forwards encrypted traffic.
- The apps are configured with our relay's URL, never iroh's public relays.
- A session still works without the relay when every device can reach the others directly, for example on the same local network.
- Anything a peer sends is untrusted input, parsed by a guard before use.

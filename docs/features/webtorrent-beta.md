# WebTorrent (Beta)

ErikrafT Drop™ provides an optional WebTorrent transfer mode for compatible modern browsers.

## How it works

- The sender selects a file and creates a WebTorrent transfer.
- ErikrafT Drop™ generates a **magnet URI** for the transfer.
- The magnet URI can be shared with the receiving device.
- Compatible peers connect using WebRTC.
- WebTorrent trackers are used for peer discovery.
- File data is transferred between peers instead of being stored as a normal cloud upload.

## Beta limitations

WebTorrent support is experimental. Transfers can be affected by:

- Browser WebRTC/WebTorrent compatibility.
- NAT and firewall restrictions.
- Network policies that restrict WebRTC traffic.
- Tracker availability.
- Whether compatible peers are online and reachable.

## Privacy

The WebTorrent mode is designed for peer-to-peer transfer. ErikrafT Drop™ does not use a central file-storage database for these transfers.

Tracker services can participate in peer discovery. Users should use trusted peers and understand that tracker infrastructure is part of the connection-establishment process.

## Relationship with local discovery

WebTorrent is different from the normal local-network discovery experience. Local discovery helps compatible devices find each other on the same network, while WebTorrent uses magnet-based peer discovery and can connect compatible peers beyond the local network when browser and network conditions permit.

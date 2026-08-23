# Media

This package is the disk-image Adapter required by ADR 0028. It validates file signatures, caps uploads at 5 MB, scopes paths by Station flavor, and exposes immutable public URLs. Apps never concatenate filesystem paths themselves.

`DiskImageStore` is tested at the filesystem interface. Object storage remains outside v1 until a production and test adapter justify that Seam.

"""CFD Backend API package.

The desktop backend starts a narrow, token-protected local workflow router.
There is no aggregate public REST router; the legacy graph was removed (see
`cfd_backend.api.v1._legacy` for historical reference and recovery plan).
Any future public web API must be rebuilt with schemas/services aligned to the
canonical models in `cfd_backend.models.*`.
"""

__all__ = ["workflow_router"]

multi-source-pager
==================

Sometimes you need to join multiple remote data sources (such as external APIs) together into
one list and support paging. multi-source-pager provides a class that manages these
multiple streams and exposes a cursor-based paging interface to clients.

Currently, the module only supports "forward" paging, additional work is required to go backwards.
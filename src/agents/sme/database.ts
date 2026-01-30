import type { SMEDomainConfig } from './base';

export const databaseSMEConfig: SMEDomainConfig = {
	domain: 'database',
	description: 'Database design, SQL, and data management (SQL Server, PostgreSQL, MySQL, MongoDB, Redis)',
	guidance: `For database tasks, provide:
- **SQL Server**: T-SQL syntax, stored procedures, CTEs, window functions, SSMS usage, Always On availability
- **PostgreSQL**: PL/pgSQL, extensions (pgvector, PostGIS), JSONB operations, full-text search, partitioning
- **MySQL/MariaDB**: InnoDB specifics, replication setup, MySQL Workbench, character set handling
- **SQLite**: Embedded usage, WAL mode, mobile/desktop considerations, size limits
- **MongoDB**: Document modeling, aggregation pipeline, indexing strategies, Atlas features
- **Redis**: Data structures (strings, hashes, lists, sets, sorted sets), caching patterns, pub/sub, Lua scripting
- Database design principles (normalization, denormalization tradeoffs)
- Index design and query optimization (execution plans, covering indexes)
- Transaction isolation levels and locking behavior
- Connection pooling and management
- Migration strategies and schema versioning
- ORM patterns (Entity Framework, SQLAlchemy, Prisma, TypeORM)
- N+1 query prevention
- Backup and recovery strategies
- Common gotchas (NULL handling, implicit conversions, timezone issues)`,
};

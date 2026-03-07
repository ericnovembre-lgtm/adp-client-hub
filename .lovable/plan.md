

## Clean Up Test Data

Found the following test records to delete:

| Table | Record | ID |
|-------|--------|----|
| **leads** | Test Roofing Company (status: new) | `764b323c...` |
| **leads** | Masonry Pro Builders (status: converted) | `ac5b9ddd...` |
| **deals** | Masonry Pro Builders - ADP TotalSource | `d8609b44...` |
| **companies** | Masonry Pro Builders | `829dcaba...` |
| **contacts** | Masonry Pro Builders (auto-created on conversion) | `ec2d8d43...` |

No linked tasks or activities found.

### Plan

Run a single database migration that deletes these 5 records in dependency order:

1. Delete the deal first (references contact + company)
2. Delete the contact
3. Delete the company
4. Delete both leads

This is a one-time data cleanup — no code changes needed.


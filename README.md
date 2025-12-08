## Requirements

```
node v24
```

# Important
Enable autofix in your IDE for:
 - ESLint
 - Prettier


## Project setup

```bash
$ make init
```
Fill necessary vars in `.env`

## env
```
To get GITHUB_TOKEN, go to your github -> settings -> Developer Settings ->
 Personal access tokens -> tokens classic 
- create new token.
Note you can select any scopes but these ones must be there:
repo (all)
workflow
```

## Compile and run the project

```bash
# development
$ make start

# production mode
$ npm run start:prod
```

## Third-party services:

- [Clerk](https://clerk.com/) - authentication

## Src structure

- `src/`
    - `main.ts` — Application entry point
    - `app.module.ts` — Root application module
    - `database` — sequelize-cli related files
        - `migrations/` — sequelize migrations
        - `config.js` - sequelize-cli db config
    - `common/` — Shared guards, decorators, and providers
        - `decorators/` — Custom decorators
        - `providers/` - Custom providers
        - `guards/` - Custom guards
    - `modules/` — Domain-level feature modules
        - `<feature>/`
            - `<feature>.module.ts`
            - `<feature>.controller.ts`
            - `<feature>.service.ts`
            - `<feature>.entity.ts` — sequelize entity/model
            - `<feature>.swagger.ts` — swagger decorators
            - `dto/`
                - `create-<feature>.dto.ts`
                - `update-<feature>.dto.ts`
    - `types/` — extended types files


## Commands
Migrations
```
npx sequelize-cli migration:generate --name [name]
```
Fetch longlife token for your user (template should be created in clerk)
```
await window.Clerk.session.getToken({ template: '<the template name you chose above>' })
```

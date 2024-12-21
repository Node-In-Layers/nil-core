# Node In Layers

Rapid, batteries included, opinionated web development with functional node.

## The Batteries Included

- REST Backend (Model/Controller)
- Fully featured ORM database system inspired by Django, with support for opensearch, mongo, dynamodb, postgres, sqlite and mysql
- Auth System (username/password, LDAP, and OAUTH) - (soon)
- Openapi Spec API Client Builder - (soon)
- React frontend admin management (soon)
- React frontend system (soon)

## IONSH Opinions

Don't be offended by our unhumble opinions, because everyone has them. Just know they give us a wide structure to lean on to produce rapidly.

- Code needs to be developed, really really fast, optimizing as we go where we know matters, and then further optimizing later.
- Creating systems that use a consistent, cohesive, and documented structure is awesome.
- Immutable and functional code is better than other code, in 99% of cases.
- A regular boring React frontend with a regular boring REST backend, is truly good enough for 99% of situations.
- Auto create boilerplate whenever possible, and keep this system not hard to setup/build/understand/maintain (_cough_ Nextjs)
- Dependency injection, saves lives.

# How A Node In Layers System is Built.

Node In Layers provides all of the frameworky stuff so that you can focus on the problem you are trying to solve or opportunity you are trying to seek. In order to do that, there are two concepts that are used heavily

1. Cohesion
1. Layers

## Cohesive Apps

Similar to Python's Django or the Ruby on Rails framework, Node In Layers follows a cohesive "app" pattern. What this means, is that code is easy to find and understand where it goes, not just by its "categorical structural" nature (is this a model, view or controller?) but by what code it "belongs" near.

An example is "auth". All code related to authentication and users, could go into an "app" called "auth". That way, if you want to know where authentication is happening, take a look at the "auth" layer.

## Developing in Layers

After an extensive development career looking for the best methods, and trying to keep up with the rate of change, eventually one will stumble upon the reality that nearly systems follow the same structure. These structure follow the natural course of how a system works together, as well as where the complicated and easy parts are. The trouble in most systems is that complexity and known troublesome code concepts are embedded throughout the application rather than locating them in the same areas.

Having code in discting layers, makes it really easy to reuse code, as well as refactor when real world situations change.

The layers that Node In Layers uses are the following

- Utils
- Libs
- Services
- Features
- Entries

### Utils - The Math Functions

There is abstract "math" like code, that could be reused in any number of systems, features and applications. Things like a "list". We call them "utilities".

- [x] Simple to unit test
- [ ] Has business specific code
- [ ] Needs integration level testing
- [x] Can be used anywhere in a system
- [ ] Allowed to communicate with external entities.

#### What Other Layers Can Utils Call?

| Utils | Libs | Services | Features | Entries |
| ----- | ---- | -------- | -------- | ------- |
| ✅    | ❌   | ❌       | ❌       | ❌      |

### Libs - The Reusable Business Bricks

There are low level small functions that take one thing and give you something else. It is always very specific to a business problem, but its something that could conceivably be used again and again.

"Parse the customer id from this JSON Order".

These functions, either combine things and produce one thing, or make many things from one thing, or they take one thing and convert it into something else. Transforms is a probably the best technical word but we just call them "libs". One thing to note, every function of the libs layer, does "one primary thing" and should be as small as reasonable. Too many steps can (but not always) indicate it might be a feature.

- [x] Simple to unit test
- [x] Has business specific code
- [ ] Needs integration level testing
- [ ] Can be used anywhere in a system
- [ ] Allowed to communicate with external entities.
-

#### What Other Layers Can Libs Call?

| Utils | Libs | Services | Features | Entries |
| ----- | ---- | -------- | -------- | ------- |
| ✅    | ✅   | ❌       | ❌       | ❌      |

### Services - The Outside World Communicators

When a system needs to no longer operate in "abstract land", you have something we call services. These are the functions that communicate out into the world and have to deal with the most complicated, uncontrolled, state and situations. These functions, if not handled carefully, are the most dangerous parts of the system because any changes, can often lead to costly refactors. "Want to switch from sqlite to mongo? Good luck".

- [ ] Simple to unit test
- [x] Has business specific code (not always)
- [x] Needs integration level testing
- [ ] Can be used anywhere in a system
- [x] Allowed to communicate with external entities.

#### What Other Layers Can Services Call?

| Utils | Libs | Services | Features | Entries |
| ----- | ---- | -------- | -------- | ------- |
| ✅    | ✅   | ✅       | ❌       | ✅      |

### Features - The features of a business system

Every system has features. A feature is ultimately made up of multiple steps laid out in a sequence. They are most often the things that people say the system does. "It can create a user" - therefore create "createUser". In this area of the code, one step follows another and many things are accomplished in one go. The sum of those steps together make up a whole. Something to be keenly aware of is that features are business specific so they don't include any code that relates to exactly how that feature gets executed.

- [ ] Simple to unit test
- [x] Has business specific code
- [x] Needs integration level testing
- [ ] Can be used anywhere in a system
- [x] Allowed to communicate with external entities. (Through services)

#### What Other Layers Can Services Call?

| Utils | Libs | Services | Features | Entries |
| ----- | ---- | -------- | -------- | ------- |
| ✅    | ✅   | ✅       | ✅       | ❌      |

## Entries

In order to kick off a feature, you need a place to do it. Command lines, web application endpoints, cloud serverless handlers. The same feature or feature can be run from multiple locations. Any code that is related to how specifically parts of your system will run, we call "entries".

- [ ] Simple to unit test
- [ ] Has business specific code
- [x] Needs integration level testing
- [ ] Can be used anywhere in a system
- [ ] Allowed to communicate with external entities. (Through services)

#### What Other Layers Can Services Call?

| Utils | Libs | Services | Features | Entries |
| ----- | ---- | -------- | -------- | ------- |
| ✅    | ❌   | ❌       | ✅       | ❌      |

## More Layers

In addition to the default layers, Node In Layers allows you to create new layers and place them where you want. Our ONLY requirement, is that default layers that are loaded (services and features) must be above one another. Other than that, you can create layers below, above, or in between these.

# Cohesive Layers In Action

Here is an example file breakdown for a coehsive layered ecommerce system that is written in typescript.

```
# User / auth things
/src/auth

/src/auth/features.ts
/src/auth/index.ts
/src/auth/libs.ts
/src/auth/services/index.ts
/src/auth/services/socialMedia.ts
/src/auth/services/local.ts

# Reusable code related to currencies.
/src/currency

/src/currency/index.ts
/src/currency/libs.ts
/src/currency/services.ts

# Things related to inventory
/src/inventory

/src/inventory/features.ts
/src/inventory/index.ts
/src/inventory/libs.ts
/src/inventory/services/index.ts
/src/inventory/services/models/Inventories.ts
/src/inventory/services/models/InventoryChecks.ts
```

# System Design - Terminology

#### System

The singular complete unit of computer code with implementations

#### Package

A collection of apps.

#### App

A highly cohesive grouping of code that adds features and capabilities to the overall system. This is the primary area where "like" business functionality lives.

#### Layer

Code that fills a categorical need. Either entries/libs/utils/features/services

#### Model

An abstract description of a type of data. Similar to the idea of a class.

# System Design - App and Layer Loading

The system is started up according to the configuration file for your server. Inside the configuration you specify the order of the apps via `core.apps`, and the order of the layers via `core.layerOrder`. This allows you to customize and create new layers, as well as put your apps at whatever layer you decide.

Each app is loaded in order, and each layer within that app is loaded in order. This increasing stack of layer dependencies, are provided to each loaded layer, so that they have full access to the layers they are supposed to and the apps that have come before it.

#### IMPORTANT

Apps must be named uniquely across the system. Otherwise there will be name/layer collisions. As a result the system will check if a non unique name is found, and then an exception is thrown at system start.

# System Design - Naming Standards

## Directories

The `src/` directory should contain sub-folders that are apps, and should generally be singular, unless it doesn't read well. Example: `src/auth` or `src/inventories`.

Inside of these app folders, there should be the layers of the app, which can either be a single file for relatively small layers: `src/auth/services.ts` or a directory that has files under it for larger layers: `src/auth/services/index.ts`. Note: There should always be an index.ts in the app folder and any layer folder.
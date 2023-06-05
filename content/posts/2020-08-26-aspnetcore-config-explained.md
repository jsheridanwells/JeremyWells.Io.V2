---
layout: post
title: Configuration in ASP.NET Core Explained
published: true
subheading: A quick guide to accessing configuration from different providers in ASP.NET Core as of version 3.
tags: 
 - csharp 
 - dotnet 
 - beginners 
 - apis
---

![Recording Console](/assets/img/aspnetcoreconfig/splash.jpg){:class="post-splash"}

###### Photo by [Alexey Ruban](https://unsplash.com/@intelligenciya?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/recording-console?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)
A common consideration for working with an ASP.NET Core application is how to store and retrieve values in configuration settings, as well as how to change and update them as the application moves to higher environments. It's common to need sensitive values like passwords, API keys, and database connection strings in order to call out to other services, and these settings must be stored separately from the application's source code. To help manage this process, ASP.NET Core contains a set of configuration providers for retrieving and storing values, as well as a class to make complex settings available in the application as strongly-typed objects.

In this tutorial, I'll use an extremely simple web API to illustrate the different configuration providers and how one overrides the next as the application moves to different environments. We'll start with some boilerplate code, create a class to hold configuration settings, then load those settings from different locations in the file system. Finally, we'll move the application to a Docker container to show how settings can be updated in different environments. 

## Prerequisites

I'll assume you have some familiarity with ASP.NET Core applications, but this article will still stay at a beginner level. To build a copy of the example application and follow along, you will need:

1. [Version 3.1 of the .NET Core SDK](https://dotnet.microsoft.com/download) running on your development machine.
1. [Docker Desktop](https://www.docker.com/products/docker-desktop) running on your local machine. The version I'm using as of this writing is 19.03.12.
1. [Postman](https://www.postman.com/), or an API tool of your choice, is recommended for making calls to the API and inspecting the results.
1. Lastly, to follow along with the examples, I've created a Github repo with a __before__ and __after__ branch. The following command will clone the repo:
```bash
$ git clone git@github.com:jsheridanwells/aspnetcore-config-example.git
```

To fetch the __before__ and __after__ branches, run:
 
 ```bash
$ git fetch origin before:before 
$ git fetch origin after:after
```
Then, `$ git checkout <branch name>` will take you to before or after.
 
 
 Lastly, I tend to prefer writing .NET Core tutorials as OS-agnostically as possible, so I'll be using the command line with __Bash__ for most of the steps, rather than Visual Studio. If you are using an IDE like Visual Studio or the Windows command line, there may be some differences from what you'll see here. 
 
## The boilerplate

Here are the important files we'll be working with in this project:
 - `appsettings.json` and `appsettings.Development.json` are two configuration files provided by ASP.NET core for configuration settings in different environments. The first file, `appsettings.json` contains any default settings, then any `appsettings.{Environment Name}.json` files override those settings. Since these files are stored at the root of the project directory, they should not contain any sensitive keys as these settings will usually checked into the project's version control system.
 - `Program.cs` is the main file that scaffolds an ASP.NET Core application and creates both the application and the host environment for the application. In this project, you'll notice a method called `.ConfigureAppConfiguration` that is commented out. Later in this tutorial, we'll uncomment the method and play around with the directives in there.
 - `Startup.cs` defines all the top-level settings for the application including configuration, dependency in injection, and the middlewares used by the application. In this class, we'll define the entry point for the app's configuration.
 - `Controllers/ConfigController.cs` is the single controller in the project with a single method called `GetConfig` that will be modified to return the values in our settings so that we can inspect the configuration values that are available in the application.
 - Lastly, `Dockerfile` will be used to build the application in a container and experiment with passing in configuration values that way. Note that we won't discuss containerizing applications in this tutorial, but you won't need to know much Docker for this demo.
 
 If you run the project using the CLI...
 ```bash
 $ dotnet run
```
... and make a GET request to `http://localhost:5000/config`, you should get `"nothing implemented yet"` as your response.
 
## Loading configuration in Startup.cs

Best practice for loading configuration settings is to create a simple class to map the configuration values, then adding them in the `Startup` class.

In this demo, our configuration will consist of two keys: `Id` will hold a `Guid` that we can pretend is a secret value like an API key, and `Location` where we'll write the location of the configuration object (e.g., `appSettings`, user secrets, environment variables etc.). At the root of the project, create a file called `MyConfig.cs` and add the following C# code:
```csharp
using System;

namespace AspNetCoreConfigExample
{
    public class MyConfig
    {
        public Guid Id { get; set; }
        public string Location { get; set; }
    }
}
```

Now, whenever we need these values, we can reference the section as `"MyConfig"`. In `appsettings.json`, the `MyConfig` section is set as follows:
```json
"MyConfig": {
    "Id": "4c3c066c-928f-4de4-86b8-09365aed6a7c",
    "Location": "from appSettings.json"
}
```

In the `Startup` class, in the `ConfigureServices` method, we'll update the method as follows:
```csharp
// Add configuration section here
var configs = Configuration.GetSection("MyConfig");
services.Configure<MyConfig>(configs);
```
`Configuration.GetSection` checks the configuration providers for any key named "MyConfig", then tries to map them to the `MyConfig` class.

You can check that the project compiles by running `$ dotnet build`.

Next, open `./Controllers/ConfigController.cs`. 

To make the configuration values available to the class, we'll add an `IOptions<T>` argument to the class constructor, and make the value of `IOptions` a private key.
```csharp
private MyConfig _configs;
public ConfigController(IOptions<MyConfig> opts)
{
    _configs = opts.Value;
}
```
Finally, we'll update the `GetConfig` method to return whatever is in the `_configs` property:
```csharp
[HttpGet]
public IActionResult GetConfig()
{
    // 3. return the config to inspect it
    var configs = _configs;
    return Ok(new { Result = "config values: ", configs });
}
```
Now, run the application using the .NET CLI:

```bash
$ dotnet run
```
Make a GET request to `http://localhost:5000/config`, and the response should come back as follows:
```json
{
    "id": "4c3c066c-928f-4de4-86b8-09365aed6a7c",
    "location": "from appSettings.json"
}
```
From the above steps, we see how configuration is loaded through the `Startup` class, then made available to the application through the `IOptions<T>` class.

In the next steps, we'll add new configurations in different locations to demonstrate the hierarchy of providers in ASP.NET Core and how one provider can override the next. 

## The provider hierarchy

The default configuration setup for an ASP.NET Core app is hidden away in the `Program` class, in a method called `.ConfigureWebHostDefaults`. By default, the method checks for settings in a hierarchy of locations and if a matching configuration is found after a preceding one, settings from the latter are used. 

[According to this Microsoft blog](https://devblogs.microsoft.com/premier-developer/order-of-precedence-when-configuring-asp-net-core/), this is the order that providers are used:
  1. The `appsettings.json` file
  1. Any `appsettings.{ ENVIRONMENT_NAME }.json` files
  1. User secrets from the .NET User Secrets Manager
  1. Environment variables
  1. Command line arguments

All of this happens under the hood, allowing us to write the configuration code once in `Startup` without having to add conditions for different environments. In the next few sections, we'll go through each of these providers, and at the end I'll show to override the default provider order for custom scenarios.

## appsettings.json

When we ran the application in the last step, the configuration values that were returned came from the `./appsettings.json` file. This can be overridden with an `appsettings.{ ENVIRONMENT NAME }.json` file. Add a file at the root of the project called `appsettings.Development.json` and paste in the following:
```json
{
  "MyConfig": {
    "Id": "6e20863b-ae31-4e6c-8711-00177586bec0",
    "Location": "from appSettings.development.json"
  }
}
```
Run the server again and make another get request to `http://localhost:5000/config` and the response will now show the values from the `Development` settings, which is the default environment when running an ASP.NET Core app from a local host.  This is useful for storing connection strings to local databases or any generic configuration values that can be safely stored in a source control repository. 

To see how a different environment can override these settings, create another files called `appsettings.Staging.json` and paste the following:
```json
{
    "MyConfig": {
        "Id": "bd304170-b899-42a9-9f9f-048e6e67a5dd",
        "Location": "from appSettings.Staging.json"
    }
}
```
We'll change the hosting environment to "Staging", then run set the application to run with that profile:
```bash
$ export ASPNETCORE_ENVIRONMENT="Staging"
$ dotnet run --launch-profile "Staging"
```

If you are using Windows, the first command is:
```cmd
> set ASPNETCORE_ENVIRONMENT="Staging"
```
Now the request returns the settings from the Staging configuration.

## User Secrets Manager

`appsettings.json` is okay for generic settings, but some other settings for development need to be stored separately from the source code. These could be API keys, passwords, settings for cloud infrastructure, or connections strings for remote databases. The .NET CLI provides a utility called the User Secrets Manager that can store and load values from a local development filesystem. 

If you are using Visual Studio, you can right-click the name of the project in the Solution Explorer to get a user secrets dialog that makes managing these values automatic.

Using the .NET CLI, there are a few steps:

 1. At the root of the project, initialize the User Secrets Manager: `$ dotnet user-secrets init`.
 1. The project will need a user secrets ID which can be any string. This is added to the .csproj file. For this project, there is already a GUID added:
```xml
<!--AspNetCoreConfigExample.csproj-->
 <PropertyGroup>
<!--    ...-->
    <UserSecretsId>fa9be5ec-53e4-4275-8941-99cf83d8c344</UserSecretsId>
</PropertyGroup>
```
 3. Using the cli, you can add new values for the `Id` and `Location` settings for the project:
 ```bash
 $ dotnet user-secrets set MyConfig:Id fa3e83d5-27e2-4a02-ae75-ad3763985290
 $ dotnet user-secrets set MyConfig:Location 'User Secrets Store'
```
Now, if you navigate to `~/.microsoft/usersecrets/<user_secrets_id>/secrets.json` on your file system, you'll see a json file added that will map to the configuration settings as before. (Note: if you're using Windows, the path to the user secrets file is `%APPDATA%\Microsoft\UserSecrets\<user_secrets_id>\secrets.json`).

Run the application, make a request to `/config` again, and the values added with the User Secrets Manager have overridden the values from `appsettings.json` without having to modify any of the code. 

Note that the User Secrets Manager is only for development purposes and should not be used in a production scenario since those values are stored on the host in plain text.

## Environment variables, command line arguments, and container commands

We can also set `MyConfig:Id` and `MyConfig:Location` as environment variables and they will take precedent over the user secrets settings.

If you are using Linux or OSX, you can add these as environment variables:
```bash
$ export MyConfig__Id=52a8f62b-43fa-4da6-8a7e-7b788402aeed
$ export MyConfig__Location="Environment Variable"
```
In Windows, the equivalent is:
```cmd
> set MyConfig:Id=52a8f62b-43fa-4da6-8a7e-7b788402aeed
> set MyConfig:Location="Environment Variable" 
```
Once again, `/config` returns the environment variable settings.

We can also run the application with command-line arguments...
```bash
$ dotnet run MyConfig:Id=be4209bc-8162-4c77-9064-8dd912b2a413 MyConfig:Location='command line'
```
... and get the same result. These could be very useful when scripting the program in different environments like a CI/CD pipeline.

Where this really comes in handy is when building the application as a container image. In the next few steps, we'll Docker-ize the application three different ways. You won't need any deep Docker knowledge to do this as long as you have Docker Desktop installed and running on your development machine (check `$ docker --version` to be sure).

The AspNetCoreConfigExample project contains a simple `Dockerfile` that is basically the example provided in the [Docker Documentation](https://docs.docker.com/engine/examples/dotnetcore/). It basically copies the code from the root directory and builds the executables, then moves the executables to a smaller environment with the .NET runtime to run the application.

On lines 17 and 18 of the `Dockerfile`, new environment variables are set which will be passed to the application from the container host:
```Dockerfile
ENV MyConfig__Id='73ce1157-c1b4-4d90-8669-2b33c86d7801'
ENV MyConfig__Location='from Dockerfile'
```

Use the following command to build an image from the `Dockerfile`:
```bash
$ docker build -t config-app .
```
Then run the image as a container on port `:5000`:
```bash
$ docker run -it -p 5000:5000 config-app
```

The `/config` response should now show values from the `Dockerfile`.

Lastly, a Docker container can be run with variables as command-line arguments to also keep these values separate from source code (or a container repository).

Run the container again with this command:
```bash
$ docker run -it -p 5000:5000 \
  -e MyConfig__Id='2021b838-6876-44b9-b123-1f760dc98aaa' \
  -e MyConfig__Location='from Docker CLI' \
  config-app
```
...and now you have settings from the command line. 

# Setting the configuration provider hierarchy

The default order of configuration providers that get called is logical for most situations, but ASP.NET Core also contains a scaffolding method for overriding the default order. 

In this application, now that there are configuration settings stored in the user secrets file, those will be used over the `asppsettings` files. We can instead specify that we want `appsettings.json` to be used instead of user secrets. 

In the sample project, in `Program.cs` there are five lines commented out that call a method called `ConfigureAppConfiguration` which takes a configuration builder as its second argument. The builder contains several methods for calling on configuration providers, and the settings from the last method to be called will override any previous settings. If you uncomment the lines you'll see the following:
```csharp
.ConfigureAppConfiguration((hostContext, config) =>
{
    config.AddUserSecrets<MyConfig>();
    config.AddJsonFile("appsettings.json");
})
```
Run the application, and you'll see that the `appsettings` configuration gets returned. If you change the order of those methods, or add any of the other providers, different configuration settings will be given preference.

## Conclusion

In this project, we saw some of the configuration providers that are available in an ASP.NET Core application and how those settings can be moved around and concealed as the application is deployed to higher environments. This gives several convenient strategies for setting up the application for a variety of deployment types. 

## Further reading

 - [https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-3.1](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-3.1)
 - [https://devblogs.microsoft.com/premier-developer/order-of-precedence-when-configuring-asp-net-core/](https://devblogs.microsoft.com/premier-developer/order-of-precedence-when-configuring-asp-net-core/)
 - [https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-3.1&tabs=windows](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-3.1&tabs=windows)

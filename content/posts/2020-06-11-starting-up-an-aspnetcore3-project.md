---
layout: post
title: Starting an Asp.Net Core Walking Skeleton
series: '.NET Core and Angular Walking Skeleton'
published: true
subheading: 'This is an introductory post for a continuing series on building up a DotNetCore and Angular web application end-to-end.'
---

![Walking Skeleton](/assets/img/2020-06-11/splash.jpg){:class="post-splash"}

###### Photo by [diana](https://unsplash.com/@thisistherealdiana?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/skeleton?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

## Introduction

I first learned about the concept of a ["walking skeleton"](http://alistair.cockburn.us/index.php/Walking_skeleton) project when I was following Michael Hartl's excellent [Ruby on Rails tutorial](https://www.railstutorial.org/book/beginning#sec-the_hello_application). One of my favorite learning tools was an introductory chapter that builds out the simplest possible iteration of a Rails project from start to deployment in order to see the process of developing a web application end-to-end. If I can go from an initial CLI command to getting a page to say "Hello" back to me from a public web server, then I can be sure I will greatly minimize the future troubleshooting that comes with taking an application from local development to production environments - a solid skeleton for building out real features.

With the walking skeleton idea in mind, this post will be the beginning of a series of tutorials taking an extremely simple [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/?view=aspnetcore-3.1) web application and building it out - from client, to server, to database, to tests, to deployment - with simple renderings of each necessary component. I intend for this project as a place to experiment with the new tools and techniques I learn along the way, and a reference for going back after I've long forgotten about what I did. Throughout, I hope this will serve as a clear introductory tutorial for beginning web developers looking to pick up on the offerings from the .NET ecosystem.

As of .NET Core version 3, the scaffold code for an ASP.NET Core WebApi project produces a simple endpoint that returns a set of temperatures. The [Weather Walking Skeleton](https://github.com/jsheridanwells/WeatherWalkingSkeleton) will take this scaffold and turn it into an API that accepts a location and returns the expected temperature for the next five days. Not an interesting requirement at all, but it provides a simple unit of functionality that can be tested throughout the layers of a web application. 

## Project overview and prerequisites

For now, here is the plan for the project:

1. An ASP.NET Core WebApi application will accept the name of a location from a client and return the expected temperatures for the next five days from the [OpenWeatherMap](https://openweathermap.org/api) API.

1. A suite of unit tests using [xUnit](https://xunit.net/).

1. An [Angular](https://angular.io/) client.

1. A CI/CD pipeling using the tools available from [Azure DevOps](https://azure.microsoft.com/en-us/services/devops/).

1. Deployment to an [AWS EC2](https://aws.amazon.com/ec2/) instance,

These are the current technologies that I use in my job, and as I explore others, I'll add them to this stack as I go.

This project will live at this [Github repo](https://github.com/jsheridanwells/WeatherWalkingSkeleton). I'll commit example code for every tutorial to its own branch, and the `master` branch will be the latest working version of the project.

These tutorials are intended for beginning web developers who want to get an initial understanding of the different technologies I'll use. I'll assume no prior experience with .NET or .NET Core, but I won't go into the syntactic features of the C# language. For that, I highly recommend [Microsoft's own intro tutorials](https://docs.microsoft.com/en-us/dotnet/csharp/tutorials/intro-to-csharp/).

The last prerequisite is to have the [.NET Core SDK](https://dotnet.microsoft.com/download/dotnet-core) installed on your machine. As of this writing, the latest version is 3.1 available for Windows, Mac OSX, and Linux. [Visual Studio](https://visualstudio.microsoft.com/downloads/) is the standard IDE for writing .NET applications, and if you're using a Windows machine, then downloading the free Visual Studio Community edition is a great option. On a Mac, using [Visual Studio Code](https://code.visualstudio.com/) with [a few plugins](https://code.visualstudio.com/docs/languages/csharp) is also a viable free option (this is how I'm writing these tutorials). I'll try to be as platform- and IDE-agnostic as I can.

## Scaffolding and picking through an ASP.NET Core WebApi

I'm assuming now you've got the .NET Core SDK installed and an IDE or text editor to view it with. We will use the command line to scaffold a WebApi project:

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '01.sh' %}

And these are the files that are produced:

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '02.sh' %}

You should `cd` into the directory now: `$ cd WeatherWalkingSkeleton`.

One last initial step - if you want to use Git for source control, you should add a `.gitignore` file with [these contents](https://github.com/github/gitignore/blob/master/VisualStudio.gitignore). This is a general list of paths to exclude from source control that will work with most project types and IDEs.

For the rest of this tutorial, we'll go through the important files in this project, then run the project to make sure it's working.

## File walkthrough

What the .NET Core CLI has given us so far is very basic boilerplate code that returns a list of weather temperatures from a single endpoint, just enough for us to see that we have working WebApi project. The three important files that make this happen are `Program.cs`, `Startup.cs`, and `WeatherForecastController.cs`.

A `Program` class with a `Main()` method is the entry point for any executable application written in C#, and it shows us that at its core a WebApi project is a console application. In our template file, the `Main()` method calls `CreateHostBuilder()` which puts together all the default settings for running a web server on our development machine:

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '03.cs' %}

In .NET Core version 3, the default functionality for creating the web server is pretty well hidden, but as the project grows, and we set up a more targeted deployment, we add that configuration here.

In `CreateHostBuilder()`, we reference a class called `Startup` which is found in the `Startup.cs` file. This is the second entry class for our web application. While `Program` configures the web server, `Startup` configures the application itself. `Startup` consists of two methods: `ConfigureServices()` and `Configure()`.

`ConfigureServices()` puts together the various services and configuration settings that make up the application. Arguably one of the most important design features of an ASP.NET Core application is the way it facilitates [dependency injection](https://stackify.com/dependency-injection-c-sharp/). All of that is ultimately implemented in this method.

The `Configure()` method sets up the various [middleware components](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-3.1) that each HTTP request will go through. Functionality like CORS, authentication, and exception handling will be set up here.

Our last important class lives in `Controllers/WeatherForecastController.cs`. Our `WeatherForecastController` class inherits from the `ControllerBase` class, and it is decorated with the `[ApiController]` annotation which makes its methods available as API endpoints:

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '04.cs' %}

The `[Route("[controller]")]` annotation defines the route based on the name of the controller class, so here the route is `/WeatherForecast`. If I had the same decoration on a controller class called `UsersController`, the route would be `/Users`.

Then, within the controller class, we've decorated a method called `Get()` with the `[HttpGet]` annotation. With the route and the action declarations, we've set up the endpoint so that a GET request to `/Users` will return the output of the `UserController.Get()` method.

Now we'll make sure this default scaffold can run locally and that there's no problem with the development environment. From your project directory (`$ cd WeatherWalkingSkeleton`, if you haven't already), in your terminal run the command: `$ dotnet run`.

If everything's good, it will tell you the project is running on ports 5000 and 5001...

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '05.sh' %}

..., and if you make a GET request to https://localhost:5001/WeatherForecast... 

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '06.sh' %}

...you'll see the return of the `WeatherForecastController.Get()` method:`

{% gist 'f46be63d2179b955fdc2ee67712bab53',  '07.json' %}

## Summary
We've just gotten an overview of this walking skeleton tutorial idea, then went on to scaffold and examine the basic parts of an ASP.NET Core WebApi application. The basic entry classes - `Program` and `Startup` - help configure and launch the application on a server, while the `Controller` classes help define the public endpoints for the application. Lastly, we used two commands to scaffold the application and to run it locally in order to verify our local development environment is working properly before adding to the project. In the next article, I'll walk through some initial configuration in our `Startup` class and adding a service to return a real weather forecast from our controller.

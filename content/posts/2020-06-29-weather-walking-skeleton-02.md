---
layout: post
title: Consuming third-party APIs in ASP.NET Core
series: '.NET Core and Angular Walking Skeleton'
published: true
subheading: In this tutorial, we'll tap into C#'s async features to pull data from a third party into an ASP.NET Core web API.
tags: 
 - csharp 
 - dotnet 
 - beginners 
 - tutorial
---

![Umbrellas](/assets/img/wws2/splash.jpg){:class="post-splash"}

###### Photo by [Wim van 't Einde](https://unsplash.com/@wimvanteinde?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/three-layers?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText)

{:.smaller-text}
 __Update__ (13 August 2020): A reader on [Dev.to]() pointed out a flaw in the original version where HTTP content was being converted to a string before being deserialized leading to potentially unnecessarily high memory usage. I've updated this article and the corresponding branch of the repo.

## Introduction

This post is the second phase of work on a [walking skeleton](https://whatis.techtarget.com/definition/walking-skeleton#:~:text=A%20walking%20skeleton%2C%20in%20a,basic%20components%20of%20the%20system.) application, and part of a series where we build out and deploy a minimal-but-functional web application built with the ASP.NET Core and Angular frameworks. In the [introductory post]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project' %}), I explained the intent of this series in more detail and set up and toured the boilerplate code for an ASP.NET Core WebApi application. In the [next post]({% post_url '2020-06-22-walking-weather-skeleton-01' %}), we made some initial configuration, and built out a controller and a service to be able to return data from a third-party API. Here, we will make our service a little more robust. We will refactor this service class to make it more testable and to take advantage of async features in C#.

## Prequisites

This article will be a continuation of [Part 0]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project' %}) and [Part 1]({% post_url '2020-06-22-walking-weather-skeleton-01' %}) of this series. My goal for this series is to walk through a sample application while explaining the _hows_ and _whys_ of the ASP.NET Core framework in detail. If you are looking for a solution for consuming a third-party API in an ASP.NET Core application, going through this tutorial on its own should suffice. If you are looking for a more fundamental understanding of the framework, [starting from the beginning]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project' %}) may be a better bet. 

For this tutorial, you will need:
1. Git, Postman, the .NET Core SDK, and an IDE or text editor that can work comfortably with C# code. Visual Studio Code with [these plugins](https://code.visualstudio.com/docs/languages/csharp) is a serviceable free setup. [Part 0]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project' %}) of this series goes through this setup in more detail.
1. An [OpenWeatherMap](https://openweathermap.org/api) API key. This is the third-party API that we'll be consuming in this example application. in [Part 1]({% post_url '2020-06-22-walking-weather-skeleton-01' %}), I walk through getting the API key and using the User Secrets Manager in .NET Core to store the key in a file system. 
1. The starting point for the example code used in this application. You can clone the starting branch for this repository with this command:
 ```bash
$ git clone -b 1_aspnetcore_webapi_setup --single-branch git@github.com:jsheridanwells/WeatherWalkingSkeleton.git
```

As in the previous articles, if this is your first time building a web API, or if you need an introduction to how to go about it in ASP.NET Core, this article will provide a detailed explanation of the steps and the features of this particular framework. I won't go into the C# language syntax, but the [Microsoft documentation](https://docs.microsoft.com/en-us/dotnet/csharp/tutorials/intro-to-csharp/) has a great primer on the language itself.

## Initial Walkthrough

If you've cloned the application from our starting point in the previous section, and if you've registered an API key for the OpenWeatherMap service, from the root directory of the project, use these steps to verify that the application is running:

```bash
$ dotnet run --project Api/WeatherWalkingSkeleton.csproj
```

If the output is error-message free, similar to the following...

```bash
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: /Users/YOU-USER-NAME/workspace/projects/Portfolio/BlogTutorials/WeatherWalkingSkeleton/Api
```

... then the application is working properly.

Open Postman, and make a GET request to this URL : `https://localhost:5001/WeatherForecast?location=chicago`. (You can substitute any other city for Chicago).

If the response is an array of temperature forecast objects, then your OpenWeatherMap API key is configured properly. If not, you may want to go back to [Part 1]({% post_url '2020-06-22-walking-weather-skeleton-01' %}) of this series to check over the User Secrets Manager setup. Alternately, if you just want to hard-code the API key and skip saving it to your file system, I'll show you the place to do that further below. 

The file that we will be refactoring the most in this tutorial is located at `./Api/Services/OpenWeatherService.cs`. Open that now in an IDE or text editor. It contains a method called `GetFiveDayForecast`: 

```csharp
public async Task<List<WeatherForecast>> GetFiveDayForecast(string location, Unit unit = Unit.Metric)
{
    string url = $"https://api.openweathermap.org/data/2.5/forecast?q={ location }&appid={ _openWeatherConfig.ApiKey }&units={ unit }";
    var forecasts = new List<WeatherForecast>();
    using (HttpClient client = new HttpClient())
    {
        var response = client.GetAsync(url).Result;
        var jsonOpts = new JsonSerializerOptions {IgnoreNullValues = true, PropertyNameCaseInsensitive = true};
        var contentStream = await response.Content.ReadAsStreamAsync();
        var openWeatherResponse = JsonSerializer.Deserialize<OpenWeatherResponse>(contentStream, jsonOpts);
        foreach (var forecast in openWeatherResponse.Forecasts)
        {
            forecasts.Add(new WeatherForecast
            {
                Date = new DateTime(forecast.Dt),
                Temp = forecast.Temps.Temp,
                FeelsLike = forecast.Temps.FeelsLike,
                TempMin = forecast.Temps.TempMin,
                TempMax = forecast.Temps.TempMax,
            });
        }
    }
    
    return forecasts;
}
```

1. The method takes in the name of a location and a unit of measurement, defaulting to metric. 
1. A URL is built using these parameters and an API key. __Note that if you want to skip the configuration step from the previous tutorial, you can copy paste your OpenWeatherMap API key here, and the method should work.__ 
1. An `HttpClient` object is built to return the data.
1. `HttpClient` makes the call to the API, reads the result as a stream, then deserializes the desired values.
1. Finally, a list of weather forecasts is built and returned.

This method will work as is, but it has a few code smells. First, the service class will be difficult to unit test because `HttpClient` is instantiated directly in the method. A test that triggers the method will make an actual call to the API which is undesirable for several reasons including inconsistent test results if the API happens to fail. We can take advantage of [dependency injection](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection?view=aspnetcore-3.1) to make the `HttpClient` object more versatile.

Another problem is that we are calling two asynchronous methods from `HttpClient`, but we are still using them synchronously. As written, `GetAsync` and `ReadAsStringAsync` will block the thread that is running this process until the two methods resolve. For what we're doing right now, this doesn't make a difference, but if we imagine a more complex version of this method - one that fetches data from several sources or processes large amounts of data - then the results of this method would not be performant nor consistent. We want to change our method to take advantage of asynchronous features that are available in C#.

Finally, while not necessarily a code smell, we can have the URL built by another method. This could make the URL-building [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)-er and more versatile as other methods get added to this class in the future. 

## Creating a URL-builder

Writing a separate URL method will be the easiest step in refactoring. When we break down the structure of the OpenWeatherMap url, its parts are primarily `domain` + `version number` + `a resource` + `query parameters` + `the API key`. Let's create a method where we can at least specify the resource and the query parameters when requesting a URL.

Below the `GetFiveDayForecast` method, add the following private method:

```csharp
private string BuildOpenWeatherUrl(string resource, string location, Unit unit)
{
    return $"https://api.openweathermap.org/data/2.5/{resource}" +
           $"?appid={_openWeatherConfig.ApiKey}" +
           $"&q={location}" +
           $"&units={unit}";
}
```

And in `GetFiveDayForecast`, change the hard-coded url to the result of the private method:

```csharp
public async Task<List<WeatherForecast>> GetFiveDayForecastAsync(string location, Unit unit = Unit.Metric)
{
    string url = BuildOpenWeatherUrl("forecast", location, unit);
    // [...]
}
```

Nothing major there, but at least it moves a big ugly string out of the method and makes it more readable.

## Injecting IHttpClientFactory

For us to unit test our `OpenWeatherMapService` class in the future, it would be better to create a mock of `HttpClient` that will return canned responses that look like OpenWeatherMap responses without actually using the real API. We want our tests to describe the service independently of the API.

However, while `HttpClient` is a very common way to make HTTP requests, it is an older .NET library and as such it is not really designed to be easily mocked in unit tests. Luckily, .NET Core provides us with an interface called `IHttpClientFactory` which solves a number of issues with making a WebApi application more stable and scalable. Specifically for us, `IHttpFactory` will create an `HttpClient` for us instead of us directly instantiating it in our method. That way, in future unit tests, we can easily inject a pseudo-`HttpClient`.

First, we will add `IHttpClientFactory` as one of the service's class constructor parameters and hold it as a private attribute:

```csharp
public class OpenWeatherService : IOpenWeatherService
{
    private readonly OpenWeather _openWeatherConfig;
    private readonly IHttpClientFactory _httpFactory;

    public OpenWeatherService(IOptions<OpenWeather> opts, IHttpClientFactory httpFactory)
    {
        _openWeatherConfig = opts.Value;
        _httpFactory = httpFactory;
    }
    // [...]
}
```

Before moving on, we'll need to declare an instance of an `IHttpClientFactory` class in our `Startup` class. From the root directory, open `./Api/Startup.cs` and add the following line to the `ConfigureServices` method:

```csharp
public class Startup
{
   // [...] 
    public void ConfigureServices(IServiceCollection services)
    {
        // [...] 
        services.AddHttpClient();
    }
}
```

The [documentation](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/http-requests?view=aspnetcore-3.1) describes a number of possibilities for setting up an `IHttpClientFactory`, but for now this will do what our code is already doing.

Back to the `OpenWeatherService`, we'll replace the code in the block that starts with `using (HttpClient client = new HttpClient())` with the following:

```csharp
var client = _httpFactory.CreateClient();
var response = await client.GetAsync(url);
var json = await response.Content.ReadAsStringAsync();
var openWeatherResponse = JsonSerializer.Deserialize<OpenWeatherResponse>(json);
foreach (var forecast in openWeatherResponse.Forecasts)
{
    forecasts.Add(new WeatherForecast
    {
        Date = new DateTime(forecast.Dt),
        Temp = forecast.Temps.Temp,
        FeelsLike = forecast.Temps.FeelsLike,
        TempMin = forecast.Temps.TempMin,
        TempMax = forecast.Temps.TempMax,
    });
} 
```

Now we've separated creating the `HttpClient` object from our own class.

At this point, the method will show errors because of the lines starting with `var response` and `var json`. WE have added the `await` keyword so that `response` and `json` represent the result of the two tasks that were called. In order to run this properly, we'll need to convert `GetFiveDayWeatherForecast` to an async method.

## Converting to async

We're halfway through refactoring, but we've still got our more complicated tasks ahead. Now we'll convert `GetFiveDayWeatherForecast` so that it runs asynchronously.

Normally a program written in C# runs sequentially, line by line, and each subsequent step waits for the preceding step. However, some operations that require separate processes - eg. reading from a database, reading from a file system - will cause the process that is executing to stop until other operations can finish. C# provides us with features to better manage these processes so that some might run in parallel and the results returned in order. [This article](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/) provides a detailed description of async methods in C# that is well worth reading. In C#, asynchronous methods are typically managed as tasks that return a result after completion. We use the `await` keyword to make sure that we have the result of the process before performing any logic on it.

To transform `GetGiveDayWeatherForecast` into an async method, first we need to change its return type from a list of weather forecasts, to a _task_ that will result in this list. While, we're at it, we'll rename the method `GetFiveDayWeatherForecastAsync` which is a convention in C# that indicates to anyone writing a consuming class that the method can be `await`-ed. We'll change the method in the `IOpenWeatherService` interface and the `OpenWeatherService` class. 

```csharp
public interface IOpenWeatherService
{
    Task<List<WeatherForecast>> GetFiveDayForecastAsync(string location, Unit unit = Unit.Metric);
}

public class OpenWeatherService : IOpenWeatherService
{
    // [...]
    public async Task<List<WeatherForecast>> GetFiveDayForecastAsync(string location, Unit unit = Unit.Metric)
    // [...]
}
```

We'll also need to change the reference to the method in the `WeatherForecastController` class located in `./Api/Controllers/WeatherForecastController.cs`. Since we will be _awaiting_ the result of `GetFiveDayForecast`, the controller method has to be async as well:

```csharp
public class WeatherForecastController : ControllerBase
{
    // [...]
    [HttpGet]
    public async Task<IActionResult> Get(string location, Unit unit = Unit.Metric)
    {
        var forecast = await _weatherService.GetFiveDayForecastAsync(location, unit);
        return Ok(forecast);
    }
}
```

You may want to compile the code (`$ dotnet build`) to make sure these changes are correct before moving on.

Back in `OpenWeatherService`, we can add `await` to the two async methods that are called from `HttpClient`:

```csharp
public async Task<List<WeatherForecast>> GetFiveDayForecastAsync(string location, Unit unit = Unit.Metric)
{
    // [...]
    var response = await client.GetAsync(url);
    // [...]
    var contentStream = await response.Content.ReadAsStreamAsync();
```

This ensures that the method waits until there's a response from the HTTP client, then waits for the result to be encoded. If our method was also getting data from another source, or performing some other intensive operation, it could do that at the same time. As it is, our method isn't performing differently, but using async features where possible is still usually best practice. 

Run the application and test `https://localhost:5001/WeatherForecast?location=chicago` again to make sure no errors were introduced. If everything is still working as it did originally, then the refactoring is working.

## Summary

The changes in this step haven't been very drastic, but they at least establish some more sustainable patterns as we continue to build out this application. Now that our classes are more testable and using async methods when possible, the next step is to set up unit tests and use those tests to support adding better exception handling. 

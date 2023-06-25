---
layout: post
title: Testing an ASP.NET Core Service with xUnit
series: '.NET Core and Angular Walking Skeleton'
published: true
subheading: We continue building out an ASP.NET Core web API by adding tests with xUnit.
tags: 
 - csharp 
 - dotnet 
 - beginners 
 - tutorial
 - testing
---

![Rainbow Test Tubes](/assets/img/wws3/splash.jpg){:class="post-splash"}

###### Photo by [Joyce McCown](https://unsplash.com/@moonshadowpress?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/test-tubes?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)

## Introduction and prerequisites

This post is part of an ongoing series where we build a ["walking skeleton"](https://whatis.techtarget.com/definition/walking-skeleton#:~:text=A%20walking%20skeleton%2C%20in%20a,basic%20components%20of%20the%20system.) application using ASP.NET Core and Angular as well as other technologies for deployment and testing. By now, our application is a minimally functional web API that organizes and returns weather data from a location. In this post, we will use [xUnit](https://xunit.net/) to test how a service handles calls to a third-party API, then how a controller responds to a successful response. In the next post, we'll then use those tests to scaffold some exception handling that's missing from our classes right now. As in other posts, the aim of this article is to go through the steps with detailed explanations.

If you would like to start from the beginning, [this post]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project'  %}){no-target} will introduce the project and walk you up to this point. If you're just here for a walkthrough of testing with xUnit, then you can:

1. Begin by cloning the project up to this point and `cd`-ing into it:
```bash
$ git clone -b 2_adding-async --single-branch git@github.com:jsheridanwells/WeatherWalkingSkeleton.git
$ cd WeatherWalkingSkeleton
```
2. Register for an [OpenWeatherMap API key](https://openweathermap.org/api),
3. And add the API key to the secrets store for this project:
```bash
$ dotnet user-secrets set "OpenWeather:ApiKey" "<YOUR-API-KEY>" --project ./Api/WeatherWalkingSkeleton.csproj
```
4. Test that the web API is working properly up to now:
```bash
$ dotnet restore
$ dotnet run --project Api/WeatherWalkingSkeleton.csproj
```
... and in another terminal, make a request to make sure a result comes out:
```bash
$ curl -k https://localhost:5001/weatherforecast?location=detroit
```
If you get what looks like an array of weather forecasts, then you are good to go.

## Testing Goals

For this stage of the project, we will add some tests for two of the classes that we've built so far: the `OpenWeatherService` and the `WeatherForecastController`. This is to establish a pattern of tests that describe the code, and as the application grows in complexity, we'll be sure new changes won't break prior functionality. 

I've read lots of opinions on software testing from engineers much more experienced than me - from strictly adhering to test-driven development to strategies that might be more pragmatic. The strategy I've decided on is to test how the `OpenWeatherService` responds to different possible responses from the third-party API. Since we do not want to call the actual OpenWeatherMap API, we will set up a substitute class where we can simulate the responses. After writing tests for the service, we'll then set up the service with the `WeatherForecastController` to test that data is returned properly from the API. From there, we'll have a small set of tests that describe the classes and can run in the future to keep any new work from breaking the prior work.

To the steps to get there are:
1. Set up our test project with the [xUnit](https://xunit.net/) and [Moq](https://github.com/moq/moq4) libraries.
1. Write tests to describe the classes' current functionality.

## Creating a test project

The [dotnet CLI](https://docs.microsoft.com/en-us/dotnet/core/tools/) contains a template for adding a xUnit test project, as well as templates for the nUnit and MSTest libraries. Let's create that project:
```bash
$ dotnet new xunit -o Tests -n WeatherWalkingSkeleton.Tests
```

Next, we add the test project to the WeatherWalkingSkeleton solution:
```bash
$ dotnet sln WeatherWalkingSkeleton.sln add ./Tests/WeatherWalkingSkeleton.Tests.csproj
```

Then, to see that the tests are discoverable, run:
```bash
$ dotnet test
```

If everything is working alright, you'll see the results of one passing fake test. 

If you are using Visual Studio, there is a built-in test explorer that will provide a UI for running and debugging tests. You can get a similar set of functionality with VS Code using the [.NET Core Test Explorer](https://marketplace.visualstudio.com/items?itemName=formulahendry.dotnet-test-explorer) plugin. Otherwise, running `$ dotnet test` from the command line will suffice for this tutorial.

We need to add a reference to our test project so that it can access the classes from the API library under test:
```bash
$ dotnet add Tests/WeatherWalkingSkeleton.Tests.csproj reference Api/WeatherWalkingSkeleton.csproj
```

Lastly, we'll add a few directories and test classes to the testing library. It will take on a similar structure to the API project so that it will be easier to compare a class to its tests. Let's add directories for any controller and service classes:
```bash
$ mkdir ./Tests/Controllers_Tests ./Tests/Services_Tests
```

Then we'll add the test classes. You can either add the files via command line or scaffold a class with the IDE you're using:
```bash
$ touch ./Tests/{/Controllers_Tests/WeatherForecastController_Tests.cs,/Services_Tests/OpenWeatherService_Tests.cs}
```

We'll also create an `Infrastructure` directory for any fixtures or utilities needed to support the test classes:
```bash
$ mkdir ./Tests/Infrastructure
```

Lastly, the fake example test can be removed:
```bash
$ rm ./Tests/UnitTest1.cs
```

## Setting up test fixtures

The `OpenWeatherService` will be the trickier class to test because it creates an `HttpClient` object to make calls to a third-party API. We want to test how it handles different kinds of responses from the API, but we don't want to actually make those requests. We'll have to simulate the kinds of responses the API might return. Also, our service class uses an `IOptions` object in order to extract a secret API key to use. We don't want any API keys to appear in our code, and in fact it's not really important whether we have a real API key or not, so we'll have to create a service to test with an alternate `IOptions` object. 

So here's a strategy for describing and testing the `OpenWeatherService`:
1. Create an empty `IOptions<OpenWeather>` object to inject into the service.
1. Create a mock `HttpClient` that can return simulated responses.
1. Handle the "happy path" scenario - how does the service return a successful response from the API?

### 1. Setting up an Options Builder

In the `Infrastructure` directory, add a class called `OptionsBuilder.cs`. This will be a static class, and so far all we need it to do is to return an `Options` object with one of the OpenWeatherMap configuration objects as its value:
```csharp
using Microsoft.Extensions.Options;
using WeatherWalkingSkeleton.Config;

namespace WeatherWalkingSkeleton.Tests.Infrastructure
{
    public static class OptionsBuilder
    {
        public static IOptions<OpenWeather> OpenWeatherConfig()
        {
            return Options.Create<OpenWeather>(new OpenWeather { ApiKey = "00000"});
        }
    }
}
```
Not much happening here, but we've got a passable object to build a test `OpenWeatherService`

### 2. Setting up an HttpClient Builder

This one is going to be more involved. Our service gets instantiated with an `IHttpClientFactory` and we call a `CreateClient` method from the object to get an `HttpClient`. This strategy is a workaround because we cannot mock an `HttpClient` directly.

To assist in mocking the objects, we'll add a very common Nuget package called `Moq`:

```bash
$ dotnet add Tests/WeatherWalkingSkeleton.Tests.csproj package Moq
```


In `Infrastructure`, create a `ClientBuilder.cs` class, also a static class. It will have a static method called `OpenWeatherClientFactory`. In order to make the method more versatile, we'll give it two arguments: `StringContent content` will be the simulated response from the API and `HttpStatusCode statusCode` will be HTTP response code, e.g. 200, 400, 401. I'll paste the entire class directly below, then explain each part:
```csharp
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Moq.Protected;

namespace WeatherWalkingSkeleton.Tests.Infrastructure
{
    public static class ClientBuilder
    {
        public static IHttpClientFactory OpenWeatherClientFactory(StringContent content, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            var handler = new Mock<HttpMessageHandler>();
            handler.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = statusCode,
                    Content = content
                });
            var client = new HttpClient(handler.Object);
            var clientFactory = new Mock<IHttpClientFactory>();
            clientFactory.Setup(_ => _.CreateClient(It.IsAny<string>()))
                .Returns(client);
            return clientFactory.Object;
        }
    }
}
```

`HttpClient` uses an object internally called `HttpMessageHandler` to make the actual HTTP request. We will mock it using the Moq library:
```csharp
var handler = new Mock<HttpMessageHandler>();
```
The `handler` has a method called `SendAsync` that is called to send the request, so we will use Moq to set up the response that we want:
```csharp
handler.Protected()
.Setup<Task<HttpResponseMessage>>(
    "SendAsync",
    ItExpr.IsAny<HttpRequestMessage>(),
    ItExpr.IsAny<CancellationToken>()
)
.ReturnsAsync(new HttpResponseMessage
{
    StatusCode = statusCode,
    Content = content
});
```
With our fake message handler, we'll create a real `HttpClient` object:
```csharp
var client = new HttpClient(handler.Object);
```
And then we'll create a mock `IHttpClientFactory` that returns our `HttpClient`
```csharp
var client = new HttpClient(handler.Object);
var clientFactory = new Mock<IHttpClientFactory>();
clientFactory.Setup(_ => _.CreateClient(It.IsAny<string>()))
    .Returns(client);
return clientFactory.Object;
```

### 3. Generating Controlled Third-Party API Responses

The last piece of infrastructure we'll need is a static class that can return some canned responses that sort of look like the responses that would come back from the OpenWeatherMap API. From testing the API in Postman, we can see that a successful response returns an array of objects that resemble the project's `WeatherForecast` class with an HTTP status of 200.

We can also predict a few other scenarios:
1. If the resource is called with a missing or invalid API key, we get a 401 status with "Invalid Api key".
1. If the resource is called without a valid city name, we get a 404 status with "city not found".
1. And, I can't be sure from testing what an error from the third-party server looks like, based on convention we'll guess that it's a 500 HTTP status with "Internal Error." as the message. 

Add a file to the `./Tests/Infrastructure` directory called `OpenWeatherResponses.cs`. Then, paste the following code which will create the canned responses for our mock HTTP factory to return:

```csharp
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using WeatherWalkingSkeleton.Models;

namespace WeatherWalkingSkeleton.Tests.Infrastructure
{
    public static class OpenWeatherResponses
    {
        public static StringContent OkResponse => BuildOkResponse();
        public static StringContent UnauthorizedResponse => BuildUnauthorizedResponse();
        public static StringContent NotFoundResponse => BuildNotFoundResponse();
        public static StringContent InternalErrorResponse => BuildInternalErrorResponse();

        private static StringContent BuildOkResponse()
        {
            var response = new OpenWeatherResponse
            {
                Forecasts = new List<Forecast>
                {
                    new Forecast{ Dt = 1594155600, Temps = new Temps { Temp = (decimal)32.93 } }
                }
            };
            var json = JsonSerializer.Serialize(response);
            return new StringContent(json);
        }

        private static StringContent BuildUnauthorizedResponse()
        {
            var json = JsonSerializer.Serialize(new { Cod = 401, Message = "Invalid Api key." });
            return new StringContent(json);
        }

        private static StringContent BuildNotFoundResponse()
        {
            var json = JsonSerializer.Serialize(new { Cod = 404, Message = "city not found" });
            return new StringContent(json);
        }

        private static StringContent BuildInternalErrorResponse()
        {
            var json = JsonSerializer.Serialize(new {Cod = 500, Message = "Internal Error."});
            return new StringContent(json);
        }
    }
}
```

## Testing the Service

Now that we can control the response we get when pretending to call the OpenWeatherMap API, we'll set up some tests to describe the `OpenWeatherService`.

So far, the class contains one method: `GetFiveDayForecastAsync`. We expect it to return a list of `WeatherForecast` objects. In the future, we'll need to update this method to handle any errors that get returned from the API, but for now the test will just describe what the method is _supposed_ to do. Also, note that the class contains a private method called `BuildOpenWeatherUrl`. Since it's a private method, we can't test it in isolation, but since we know that `GetFiveDayForecastAsync` depends on it, any failures from the private method will be indicated when testing the public method.

Here are a couple of responses that we can expect from `GetFiveDayForecastAsync`:
 1. It will return a list of `WeatherForecast` objects, no other objects.
 1. The `Date` and the `Temp` properties that come from the API response will be the same when the `WeatherForecast` list is created.

Add a test file in the `.Tests/Services_Tests` directory:
```bash
$ touch ./Tests/Services_Tests/OpenWeatherService_Tests.cs
```

The class, with all of the `using` statements should start like this:
```csharp
using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using WeatherWalkingSkeleton.Infrastructure;
using WeatherWalkingSkeleton.Models;
using WeatherWalkingSkeleton.Tests.Infrastructure;
using Xunit;

namespace WeatherWalkingSkeleton.Services
{
    public class OpenWeatherService_Tests
    {

    }
}
```

Inside the service, let's add two methods for each of the descriptions we want to provide. Here are the methods:

```csharp
[Fact]
public async Task Returns_A_WeatherForecast()
{

}

[Fact]
public async Task Returns_Expected_Values_From_the_Api()
{

}
```

Note that the `[Fact]` annotation allows a test explorer to find and run any test methods.

Now we'll add code to the first method. Since in each test, we'll need to create a `OpenWeatherService`, we'll generate `IOptions<OpenWeather>` and `IHttpClientFactory` objects using the fixtures created above, then create an `OpenWeatherService` named `sut` for "system under test". With the service instantiated, we'll call `GetFiveDayForecastAsync`. On the last line, the `Assert` class from xUnit is used to test that the method is returning the type of object that we expect:

```csharp
[Fact]
public async Task Returns_A_WeatherForecast()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.OkResponse);
    var sut = new OpenWeatherService(opts, clientFactory);
    
    var result = await sut.GetFiveDayForecastAsync("Chicago");

    Assert.IsType<List<WeatherForecast>>(result);
}
```

The second test is set up exactly the same way, but in this test we're seeing if we find the same `Date` and `Temp` values that we loaded `OpenWeatherResponses.BuildOkResponse()` with earlier:

```csharp
[Fact]
public async Task Returns_Expected_Values_From_the_Api()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.OkResponse);
    var sut = new OpenWeatherService(opts, clientFactory);

    var result = await sut.GetFiveDayForecastAsync("Chicago");
    
    Assert.Equal(new DateTime(1594155600), result[0].Date);
    Assert.Equal((decimal)32.93, result[0].Temp);
}
```

Now run the tests in the IDE test explorer, or in the command line terminal (`$ dotnet test`) to make sure they pass.

## Testing the Controller

Now we'll add a file for running some controller tests:
```bash
$ touch ./Tests/Services_Tests/WeatherForecastController_Tests.cs
```

Just like the service, so far our `WeatherForecastController` that consumes the `OpenWeatherService` just has one method called `Get` for returning the result of the service. While our previous tests were strictly isolated unit tests - the API and the HTTP client were mocked - I'd like the controller tests to be more of an _integration_ test: I'd like to know how it responds to different results from the `OpenWeatherService` that it depends on. If we make a change to the `OpenWeatherService` that could break the `WeatherForecastController`, we wouldn't know it if we were mocking the service in these tests. So in our tests, we'll build an `OpenWeatherService` with the API response that we expect, then build the controller with that. 

Our `WeatherForecastController` requires an `ILogger<WeatherForecastController>` in the constructor. Luckily, the `Microsoft.Extensions.Logging` library that it the interface comes from also has a class called `NullLogger<T>` that lets us just pass in an empty logger since logging has nothing to do with the functionality that we're testing. The setup for creating the controller as our system under test is as follows (Note, I'll copy in the full method further down):

```csharp
var opts = OptionsBuilder.OpenWeatherConfig();
var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.OkResponse);
var service = new OpenWeatherService(opts, clientFactory);
var sut = new WeatherForecastController(new NullLogger<WeatherForecastController>(), service);
```

After the controller is created we will `await` the result and convert it to an `OkObjectResult` that will contain the API response to evaluate:
```csharp
var result = await sut.Get("Chicago") as OkObjectResult;
```

Lastly, we'll make sure that a successful response from the `OpenWeatherService` results in a "success" response from the controller, along with the `List<WeatherForecast>` object that we're expecting:
```chsarp
Assert.IsType<List<WeatherForecast>>(result.Value);
Assert.Equal(200, result.StatusCode);
```

Altogether, the `WeatherForecastController_Tests` class should look like this:
```csharp
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using WeatherWalkingSkeleton.Controllers;
using WeatherWalkingSkeleton.Models;
using WeatherWalkingSkeleton.Services;
using WeatherWalkingSkeleton.Tests.Infrastructure;
using Xunit;

namespace WeatherWalkingSkeleton.Tests.Controllers_Tests
{
    public class WeatherForecastController_Tests
    {
        [Fact]
        public async Task Returns_OkResult_With_WeatherForecast()
        {
            var opts = OptionsBuilder.OpenWeatherConfig();
            var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.OkResponse);
            var service = new OpenWeatherService(opts, clientFactory);
            var sut = new WeatherForecastController(new NullLogger<WeatherForecastController>(), service);

            var result = await sut.Get("Chicago") as OkObjectResult;

            Assert.IsType<List<WeatherForecast>>(result.Value);
            Assert.Equal(200, result.StatusCode);
        }
    }
}
```

Run the tests again, and we should have three total successful tests.

## Conclusion

That's far enough for now. From this tutorial, we were able to install a test library for an ASP.NET Core WebApi project. We also created some initial infrastructure to control the dependencies that we are not testing as well as create a mock version of a third-party API so that we can control the different responses it might give. We used this to evaluate successful responses from our service, then to evaluate the same responses in the controller that consumes the service. 

In the next tutorial, we'll start a [TDD](https://www.agilealliance.org/glossary/tdd/#q=~(infinite~false~filters~(postType~(~'page~'post~'aa_book~'aa_event_session~'aa_experience_report~'aa_glossary~'aa_research_paper~'aa_video)~tags~(~'tdd))~searchTerm~'~sort~false~sortDirection~'asc~page~1)) process for adding exception handling functionality to the controller and service methods.

### References

These posts proved especially helpful in figuring out how to use `HttpClient` in tests.

 - [How to mock HttpClient in your .NET / C# unit tests](https://gingter.org/2018/07/26/how-to-mock-httpclient-in-your-net-c-unit-tests/)
 - [An Introduction ot HttpClientFactory](https://www.stevejgordon.co.uk/introduction-to-httpclientfactory-aspnetcore) 



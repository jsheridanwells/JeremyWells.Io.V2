---
layout: post
title: TDD and Exception Handling with xUnit in ASP.NET Core
series: '.NET Core and Angular Walking Skeleton'
published: true
subheading: We continue building out an ASP.NET Core web API by adding tests with xUnit and using those to guide implementing exception handling
tags: 
 - csharp 
 - dotnet 
 - beginners 
 - testing
---

![Electronic circuits](/assets/img/wws4/splash.jpg){:class="post-splash"}

###### Photo by [Nicolas Thomas](https://unsplash.com/@nicolasthomas?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/s/photos/test?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)

## Introduction and prerequisites

In this post, we're continuing our "walking skeleton" application where we build and deploy a minimal application with an ASP.NET Core WebApi and an Angular client. At this stage, the API is almost ready. We've got a controller that accepts a city location, a service that calls the third-party [OpenWeatherMap](https://openweathermap.org/api) API to return forecasts for that location, and in the last post we added the xUnit testing framework to describe the API. If you would like to start from the beginning, [this is the first post]({% post_url '2020-06-11-starting-up-an-aspnetcore3-project'  %}){.no-target}. 

The goal of this series, and this application, is to create a bare-bones, testable, and deploy-able web application that can be used as a reference for starting similar projects. In each of these steps, I intend to describe the code we add in detail.

If you're starting the tutorial from this post, you can clone the following branch and continue modifying the code from there (note that you will need the [.NET Core SDK](https://dotnet.microsoft.com/download) installed on your machine):
```bash
$ git clone -b 3_adding-tests --single-branch git@github.com:jsheridanwells/WeatherWalkingSkeleton.git
$ cd WeatherWalkingSkeleton
$ dotnet restore
```

You'll also need to sign up for and register an [OpenWeatherMap API key](https://openweathermap.org/api). [This previous post](https://www.jeremywells.io/2020/06/22/walking-weather-skeleton-01.html){.no-target} contains the steps for doing that.

## Our TDD process

In the previous step, we started with one controller method that called one service method, then we set up a testing library using [xUnit](https://xunit.net/) and [Moq](https://github.com/moq/moq4). With our testing framework ready to go, we'll use unit tests to guide some improvements to our API endpoint that fetches weather forecasts.

__TDD__ stands for "Test-Driven Development", and it's a technique for ensuring that our code performs according to expectations, documenting the current expectations for code, and using tests to help ensure that changes aren't breaking prior functionality, especially when deploying code to higher environments. I won't discuss here the different types of testing, or the differing opinions on testing, but I've recently found [this article](https://dev.to/jackmarchant/a-practical-guide-to-test-driven-development-485g) which gives an excellent overview of the different software testing strategies and where they can fit into different kinds of projects.

Our test-driven development is going to follow a __Red__, __Green__, __Refactor__ pattern:
1. __Red__: We will write a test and ensure that it fails. That way we're sure that our changes are actually bringing about the behavior we want, not some unanticipated side effect.
1. __Green__: We will modify our methods so that the tests pass.
1. __Refactor__: We will do any necessary refactoring to our changes so that the code is up to par, while making sure the test still passes.

## Our changes

Right now, our API consists of one endpoint - `GET http://localhost:5000/WeatherForecast/:location` - that terminates at the `WeatherForecastController` and calls the `Get` method. Inside the `Get` method, the `OpenWeatherService.GetFiveDayForecastAsync` method is then called which returns a list of five forecasts for the next fifteen hours.

While manually testing this endpoint with [Postman](https://www.postman.com/), and running our three current unit tests, proves that this indeed happens, our methods are very brittle right now. If an API consumer calls the endpoint without a location, or with a non-existent location, the unexpected result isn't handled. If we deploy the API to another environment without registering the OpenWeatherMap API key, we need to handle that failure as well in a way that communicates the problem to other developers. Also, the OpenWeatherMap API might itself fail and we need to be able to communicate the source of the problem. At the moment, if anything unexpected happens a long and unhelpful `NullReferenceException` is returned from the API.

Let's refactor the methods to handle the following scenarios:
 
1. __One of our users sends a location that OpenWeatherAPI doesn't recognize:__ I would expect this to happen frequently, and it wouldn't be the result of any fault in the application, so to handle this we'll send back a helpful message to the user without throwing an exception.
1. __The OpenWeatherMap API key is invalid:__ Right now, the application is running on our local machines with an API key configured. When we deploy to other environments, those servers will also need an API key to run. If the application gets deployed without one, or if the API key expires, we'll need to make that clear to any developers if OpenWeatherMap returns an unauthorized response. 
1. __OpenWeatherMap returns its own error:__ Since OpenWeatherMap is a third party, we cannot guarantee that it always functions within our own application as expected. If for some reason, a request to OpenWeatherMap fails, we need to handle that scenario as well.

## Testing the service

We'll modify the `OpenWeatherService` class first. Open the corresponding unit test file: `./WeatherWalkingSkeletonTests/Services_Tests/OpenWeatherService_Tests.cs`. Note, that in the previous post, we also created a static fixture class called `OpenWeatherResponses` that returns three simulated error responses from the OpenWeatherMap API: `NotFoundResponse`, `UnauthorizedResponse`, `InternalErrorResponse`. We'll use these responses to trigger the errors we could get from the third-party API.

In `OpenWeatherService_Tests` add the following tests:
```csharp
[Fact]
public async Task Returns_OpenWeatherException_When_Called_With_Bad_Argument()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.NotFoundResponse,
        HttpStatusCode.NotFound);
    var sut = new OpenWeatherService(opts, clientFactory);

    var result = await Assert.ThrowsAsync<OpenWeatherException>(() => sut.GetFiveDayForecastAsync("Westeros"));
    Assert.Equal(404, (int)result.StatusCode);
}

[Fact]
public async Task Returns_OpenWeatherException_When_Unauthorized()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.UnauthorizedResponse,
        HttpStatusCode.Unauthorized);
    var sut = new OpenWeatherService(opts, clientFactory);

    var result = await Assert.ThrowsAsync<OpenWeatherException>(() => sut.GetFiveDayForecastAsync("Chicago"));
    Assert.Equal(401, (int)result.StatusCode);
}

[Fact]
public async Task Returns_OpenWeatherException_On_OpenWeatherInternalError()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.InternalErrorResponse,
        HttpStatusCode.InternalServerError);
    var sut = new OpenWeatherService(opts, clientFactory);

    var result = await Assert.ThrowsAsync<OpenWeatherException>(() => sut.GetFiveDayForecastAsync("New York"));
    Assert.Equal(500, (int)result.StatusCode);
}
```

The tests follow the basic setup of the previous two tests, but we've configured the different possible error responses from the mock API. When OpenWeatherMap returns an unexpected result, we want our service to throw a custom exception called `OpenWeatherException`. This exception will communicate to the consuming class that the failure came from the third-party API.

If you run the test using your IDE's test runner, or using `$ dotnet test` in the terminal, we see our tests fail. We expected our custom exception and instead got a `NullReferenceException` since our service can't yet handle a response that it can't parse. 

Open `./Api/Services/OpenWeatherService.cs` and navigate to the `GetFiveDayForecastAsync` method. Going through the method line by line, we see the point where the method waits for a response from OpenWeatherMap:
```csharp
var response = await client.GetAsync(url);
```
We'll check if the response is successful, and if it is then we'll deserialize the response as we were initially. If it's any other result, we'll build and throw an `OpenWeatherException` so the consuming class can respond accordingly. The _if/else_ block will look like this (I'll copy the entire method further below):
```csharp
if (response.IsSuccessStatusCode)
{
    // deserialize and return an OpenWeatherResponse
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
    
    return forecasts;
}
else
{
    // build an exception with information from the third-party API
    throw new OpenWeatherException(response.StatusCode, "Error response from OpenWeatherApi: " + response.ReasonPhrase);
} 
```
The exception will contain the OpenWeatherMap HTTP status code and a simple message, then a consuming class can create logic based on that information.

Below is what the entire `GetFiveDayFirecastAsync` method should look like:
```csharp
public async Task<List<WeatherForecast>> GetFiveDayForecastAsync(string location, Unit unit = Unit.Metric)
{
    string url = BuildOpenWeatherUrl("forecast", location, unit);
    var forecasts = new List<WeatherForecast>();
   
    var client = _httpFactory.CreateClient("OpenWeatherClient");
    var response = await client.GetAsync(url);
    
    if (response.IsSuccessStatusCode)
    {
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
        
        return forecasts;
    }
    else
    {
        throw new OpenWeatherException(response.StatusCode, "Error response from OpenWeatherApi: " + response.ReasonPhrase);
    } 
}
```
Run the tests again and they should all pass. At this point, we've done the _Red_ and _Green_ steps of the test process. I'll leave it up to you to find any opportunities for refactoring this method or letting it go as is.

## Testing the controller

Our service can now graceful indicate if there was a failed response from the OpenWeatherMap API. Now we need our controller communicate these exceptions back to our API's consuming clients.

Going back to our original three scenarios, the controller could respond to each in the following ways:
1. If OpenWeatherMap couldn't recognize the location, the controller can return a `400 BadRequest` response and let the consumer know the name of the location that failed. Also, if the request is made without a location, we should return a `400` before even calling the service.
1. If the OpenWeatherMap returns an `Unauthorized` response, it's due to an invalid API key and for this project that's likely from a bad configuration. We'll return a `500 Internal Server Error` with the message from the OpenWeatherMap API which will indicate if the request was not authorized.
1. If there is any other error, we'll return another `500` response with the message from OpenWeatherMap. Lastly, we'll also return a `500` response for any other exception that is thrown within the application.

The responses above lead to three tests that we'll add to `./Tests/Controllers_Tests/`:
```csharp
[Fact]
public async Task Returns_400_Result_When_Missing_Location()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.NotFoundResponse);
    var service = new OpenWeatherService(opts, clientFactory);
    var sut = new WeatherForecastController(new NullLogger<WeatherForecastController>(), service);

    var result = await sut.Get(String.Empty) as ObjectResult;
    
    Assert.Equal(400, result.StatusCode);
}

[Fact]
public async Task Returns_BadRequestResult_When_Location_Not_Found()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.NotFoundResponse,
        HttpStatusCode.NotFound);
    var service = new OpenWeatherService(opts, clientFactory);
    var sut = new WeatherForecastController(new NullLogger<WeatherForecastController>(), service);
    
    var result = await sut.Get("Westworld") as ObjectResult;
    
    Assert.Contains("not found", result.Value.ToString());
    Assert.Equal(400, result.StatusCode);
}

[Fact]
public async Task Returns_OpenWeatherException_When_Unauthorized()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.UnauthorizedResponse,
        HttpStatusCode.Unauthorized);
    var sut = new OpenWeatherService(opts, clientFactory);

    var result = await Assert.ThrowsAsync<OpenWeatherException>(() => sut.GetFiveDayForecastAsync("Chicago"));
    Assert.Equal(401, (int)result.StatusCode);
}

[Fact]
public async Task Returns_500_When_Api_Returns_Error()
{
    var opts = OptionsBuilder.OpenWeatherConfig();
    var clientFactory = ClientBuilder.OpenWeatherClientFactory(OpenWeatherResponses.UnauthorizedResponse,
        HttpStatusCode.Unauthorized);
    var service = new OpenWeatherService(opts, clientFactory);
    var sut = new WeatherForecastController(new NullLogger<WeatherForecastController>(), service);
    
    var result = await sut.Get("Rio de Janeiro") as ObjectResult;
    
    Assert.Contains("Error response from OpenWeatherApi: Unauthorized", result.Value.ToString());
    Assert.Equal(500, result.StatusCode); 
}
```
If we run them, they should fail.

We'll open the class under test in `./Api/Controllers/WeatherForecastController.cs` and find the `Get()` method. Add the following as the first step of the method to check if there is a usable `location` value with the request:
```csharp
[HttpGet]
public async Task<IActionResult> Get(string location, Unit unit = Unit.Metric)
{
   if (string.IsNullOrEmpty(location))
       return BadRequest("location parameter is missing");
   // [ ... ] 
}
```
Now, three of the four new tests should be failing. 

For the rest of the tests, we can get them to pass by returning a `400 Bad Request` result if OpenWeatherMap can't find the location, or returning a `500 Internal Server Error` for any other reason, along with a helpful message. Also, we can wrap our logic in a _try/catch_ block that will handle an `OpenWeatherException` as indicated above, then handle any other exception. The updated `Get()` method can now look like this:
```csharp
[HttpGet]
public async Task<IActionResult> Get(string location, Unit unit = Unit.Metric)
{
    if (string.IsNullOrEmpty(location))
        return BadRequest("location parameter is missing");
    try
    {
        var forecast = await _weatherService.GetFiveDayForecastAsync(location, unit);
        return Ok(forecast);
    }
    catch (OpenWeatherException e)
    {
        if (e.StatusCode == HttpStatusCode.NotFound)
            return BadRequest($"Location: \"{ location }\" not found.");
        else
            return StatusCode(500, e.Message);
    }
    catch (Exception e)
    {
        return StatusCode(500, e.Message);
    }
}
```
Run the tests and we're successful if we now have nine passing tests in the collection. As before, if you would like to experiment with other ways to handle exceptions from the `OpenWeatherService`, you can now refactor the method secured with its corresponding tests.

## Conclusion

In this tutorial, we started with a project with an API endpoint that could handle a "happy path," but could not meaningfully handle exceptions. We came up with three possible exception scenarios, then used test-driven development for describing the desired behavior for our classes, making changes until the tests passed. We now have a more robust example ASP.NET Core project. In the next tutorials, we will Docker-ize the API to support complimentary development, then scaffold an Angular project to serve as a client.



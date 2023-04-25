---
title: A headless Raspberry Pi workflow
subheading: Setting up a headless Raspberry Pi mini-server for pain-free, peripheral-free programming
published: true
description: Setting up a headless Raspberry Pi mini-server for pain-free, peripheral-free programming
tags: 
 - raspberryPi
 - IOT 
---

![Raspberry Pi](/assets/img/rpi/rpi.jpg){:class="post-splash"}
###### Photo by [Quentin Schulz](https://unsplash.com/@0leil) on [Unsplash](https://unsplash.com/photos/51nYPDEafWc)

It's always great to follow-up on a cool hobby IOT experiment, and I've collected a few Ardunios, Trinkets, and Raspberry Pis that are always waiting around for a free weekend. The Raspberry Pi can be a wonderfully versatile little computer that exposes pins for external controllers and sensors, but it could also be a simple $35 home server, or even a fully functioning Linux desktop computer. 

My kids and I have set up our own Minecraft server, and I've made a little weather clock, and experimented with server deployment configurations and a home media streamer as well. Some more elaborate projects I'd like to try some day include a [Raspberry Pi Kubernetes cluster](https://ubuntu.com/tutorials/how-to-kubernetes-cluster-on-raspberry-pi#1-overview) or a [Grateful Dead Time Machine](https://www.gratefuldeadtimemachine.com/build-your-own). Since the whole OS lives on a Micro SD card, it's easy to keep a few and flash different OSes, swapping them out for different projects. In fact, with all of the intricate AWS and Azure learning I've had to do for my job, using a Raspberry Pi to test out provisioning a bare-bones server is a great way to step back and get a handle on what's actually happening under the hood when you're sending your artifacts off to some nebulous data center with a simple command.

One set of steps I always find myself looking up and repeating is for creating a Headless Raspberry Pi - just configure an OS on an SD card and turn it on, no keyboard, no monitor, just the machine.

 You can certainly load a Raspberry Pi with its custom OS, a Linux Debian port called Raspbian, hook it up like a desktop computer and do all of the above. But for me, the most convenient way is to set it up on my local WiFi network and connect to it from the workstation where I do everything else, using my personal dev environment and code editors to also load programs onto the Raspberry Pi. That's where a headless, no-GUI Raspberry Pi is ideal.

In this article, I've combined steps from the tutorials I usually reference so that I've got some quick, easy steps to follow every time I put together a new headless Raspberry Pi from scratch.

## Prereqisites

For this article, the only thing you'll need is a Raspberry Pi, the model doesn't matter. In fact, most of these steps are more related to provisioning a simple Linux server, so they could be applicable to several other hardware as well. You'll also need some sort of SD card reader on your desktop computer.

## Creating your Raspberry Pi image

The first, quickesy way to set up a Raspberry Pi OS is using the [Raspberry Pi Imager](https://www.raspberrypi.com/software/). 

- [Download a copy](https://www.raspberrypi.com/software/)
- Meanwhile, plug in an SD card to whatever SD card reader you have. 
- You may want to re-format the SD card so that the OS image is freshly installed. On a Windows computer, I do this by finding the SD card drive in File Explorer under "This PC" and right-clicking it for its formatting options. Choose "FAT" as the file system type, and the default selections for everything else. Note, that any data already on the card will be erased.

![picture of reformatting](/assets/img/rpi/rpi-reformatting-screen.png){:class="post-img"}

- Once the Raspberry Pi Imager is done downloading, open it up. You may have to give it administrative permissions on your computer.
- You'll have two selections to make, __1. Choose OS__ and __2. Choose Storage__.
- Click "Choose OS" and select `Raspberry Pi OS (Other)`, then `Raspberry Pi OS Lite (32-bit)`. This version of the OS doesn't include a Desktop environment so it will only be controllable from the terminal.
- Click "Choose Storage" and one of the options should be the drive for the SD card that you formatted earlier.
- Lastly, click the "Write" button and the imager will do its work to load a boot-able OS onto the SD card. On my machine, this process takes about 5 minutes.

## SSH and networking config

After the imaging is complete, you could eject the SD card and boot up the Raspberry Pi with a monitor, then see a Linux command-line interface. But since this is going to be a headless, peripheral-free setup we need to give the OS some extra information to enable it to connect to a local WiFi network and enable to us to connect it to it from a workstation.

If the SD card drive was ejected after the image was written, plug it back in and open it in File Explorer or Finder:

 - Add an empty file called `ssh` in the top directory of the SD card. The file shouldn't have an extension, or any content inside. This tells the OS to accept SSH connections when it boots.
 - With a text editor create a file called `wpa_supplicant.conf`. This is where you'll add information so it can connect to your local WiFi network on startup. Paste the following text, substituting your own Wifi name and password:

```
country=US
ctrl_interface=DIR=/var/run/wpa_supplicat GROUP=netdev
update_config=1

network={
	ssid="<YOUR WIFI NAME>"
	scan_ssid=1
	psk="<YOUR WIFI PASSWORD>"
	key_mgmt=WPA-PSK
}
 ```
 - Also save this file on the SD card in the root directory.

## First Login

 Your Raspberry Pi OS should be good to go. Plug the card into the Raspberry Pi and turn it on. It should only take a minute or two to boot up. Once it does, open a termninal on your workstation computer and make an SSH connection using the default login:
```
$ ssh pi@raspberrypi.local
```
 The password will be `raspberry`. If you are successful, you'll see the command-line interface for the Raspberry Pi and you're ready to run commands.

 The set of the commands in the terminal will look something like this:

![ssh login](/assets/img/rpi/rpi-ssh-login.png){:class="post-img"}

 The first thing I do is change the hostname. That way, if I run multiple Raspberry Pis on the same local Wifi, there's no confusion. 

  - In the Raspberry Pi terminal, type `$sudo raspi-config`. This will bring up the configuration options.
![Raspbery Pi Configuration Screen](/assets/img/rpi/rpi-raspi-config.png){:class="post-img"}
 - Select `1 System Options`
 - Select `S4 Hostname` and you'll be prompted to change the hostname. Now, when you SSH into the machine, it will be `ssh pi@<NEW HOSTNAME>.local`
 - Exit the config screen and you can reboot if you'd like.

 The next thing is to at the very least, change the password for the `pi` user. I like to replace the `pi` user with a brand new admin user. These are just regular Linux commands.

 - Change the password for `pi` just to be safe. Type `$ passwd` and follow the prompts.
 - Create a new user: `$ sudo add user <USERNAME>`. It will prompt you for a password and ask for some user profile information. 
 - Then add your new user to the `sudo` group so that they can run adminstrative commands:
 ```
 $ sudo usermod -aG sudo <USERNAME>
 ```
 - You can switch to your new user: `$ su - <USERNAME>`
 - Or you can exit and reconnect with your new user: 
 ```
 $ sudo reboot
 $ ssh <USERNAME>@<NEW HOSTNAME>.local
 ```
 - Once your reconnected, you can optionally remove default the `pi` user.
 ```
 $ sudo deluser -remove-home pi
 ```
  - And to safely turn off the Raspberry Pi:
```
$ sudo shutdown now
```

Now your Raspberry Pi is set up to run headlessly with and it's at least minimally secure.

## Editing code directly on the Pi

Now that you're Raspberry Pi is provisioned, you're ready to make it do some stuff. You'll need to add some code to run. By default, it should have a working Python environment. But how do you get the code over to the Pi? You could fire up a bare-bones vim or nano editor, but that could be a little painful compared to the well-accessorized code editor on your local workstation. 

One way to get around this is to set up your Raspberry Pi code as a remote Git repository, write the files in the local repository, then push them over. I used to do that, it's not too complicated, and it you have the advantage of having a local repo to store all of your code and projects and have them last while you change out and reconfigure multiple Raspberry Pi setups. [This article]() gives some great instructions on how to go about setting up your own remote Git repository.

An even easier solution if you're a VS Code user is, using a new plugin, you can access a directory on your Pi via SSH and edit files directly onto the Pi in your code editor. 

In VS Code, install the plugin [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh). Then type `CTRL/CMD + SHIFT + P` and type `Remote - SSH Connect to Host`. It will ask for an SSH url (exactly as above), prompt you for a password, then a new VS Code editor will open with access to the Raspberry Pi file system. 

And with all that, you've got an unburdened Raspberri Pi for all your home tinkering.

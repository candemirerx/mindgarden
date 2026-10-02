# Bluetooth receiver dependency

InTheHand.Net.Personal.dll is the desktop assembly from the official 32feet.NET 3.5.0.3 NuGet package:
https://www.nuget.org/packages/32feet.NET/3.5.0.3

Authors: Peter Foot, Alan McFarlane / In The Hand. Original library copyright 2003–2012. The project license is included as 32feet-LICENSE.txt (MIT), from https://github.com/inthehand/32feet.

Windows PowerShell loads this bundled assembly to publish the Not Bahcesi PC RFCOMM service. No Python installation or manual COM-port setup is required. The existing explicit COM-port option remains available for older helpers.

Service UUID: 93c7b30b-d973-4873-bf10-148491968b2c.

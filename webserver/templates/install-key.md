# RetroStar Zugang

Hallo <%= data.username %>,

<% if (data.installKey) { %>

die Installation des RetroStar-Zugangs geht bequem mit dem Debian-Paket,
das Du wie folgt installieren kannst:

```shell
sudo apt update
curl -LO https://retrostar.classic-computing.de/retrostar-client-1.0.deb
sudo apt install -y ./retrostar-client-1.0.deb
rm ./retrostar-client-1.0.deb
```

Während der Installation wirst Du nach Deinem Installationsschlüssel gefragt,
er lautet **<%= data.installKey %>**.

Falls Du die Konfiguration lieber manuell durchführen möchtest, kannst Du Dir die
OpenVPN-Konfigurationsdatei auch herunterladen.

https://retrostar.classic-computing.de/client-conf/<%= data.installKey %>.

Schau Dir den [Quellcode](https://github.com/hanshuebner/retrostar/tree/main/client-package)
an, wenn Du wissen willst, wie RetroStar funktioniert.

<% } else { %>

für Dich ist noch kein Zugang zum RetroStar eingerichtet.

<% } %>

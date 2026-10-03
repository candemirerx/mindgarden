#!/usr/bin/env bash
# USB ile bağlı tüm telefonları 5555 portunda kablosuz adb'ye alır ve bağlanır.
# Telefon yeniden başlatılınca port kapanır (root olmadan kalıcı yapılamıyor);
# o zaman telefonu bir kez kabloyla takıp bu betiği yeniden çalıştırın.
# Kablo takılı değilken çalıştırılırsa bilinen adreslere yeniden bağlanmayı dener.
export MSYS_NO_PATHCONV=1
ADB="${ADB:-/c/Users/candm/AppData/Local/Android/Sdk/platform-tools/adb}"
PORT=5555
KAYIT="$(dirname "$0")/.adb-kablosuz-adresler"

usb=$("$ADB" devices | awk 'NR>1 && $2=="device" && $1 !~ /:|_adb-tls/ {print $1}')
adresler=""
for seri in $usb; do
    model=$("$ADB" -s "$seri" shell getprop ro.product.model | tr -d '\r')
    ipler=$("$ADB" -s "$seri" shell ip -4 -o addr show | tr -d '\r' \
        | awk '$2=="wlan0" || $2 ~ /^tun/ {split($4,a,"/"); print a[1]}')
    if [ -z "$ipler" ]; then echo "$model ($seri): Wi‑Fi/Tailscale adresi yok, atlandı."; continue; fi
    "$ADB" -s "$seri" tcpip $PORT >/dev/null
    echo "$model ($seri): $ipler"
    adresler="$adresler $ipler"
done
[ -n "$adresler" ] && printf '%s\n' $adresler > "$KAYIT"
[ -z "$adresler" ] && [ -f "$KAYIT" ] && adresler=$(cat "$KAYIT")

sleep 3
for ip in $adresler; do "$ADB" connect "$ip:$PORT"; done
"$ADB" devices

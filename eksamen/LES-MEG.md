# Eksamenssett

Legg PDF-ene her. `verktoy/lag-kort.py --type eksamen` leser alle
`.pdf` i denne mappa og lager kort av oppgavene.

Mappa er gitignorert. Settene blir liggende på maskinen din og havner
verken i repoet eller i vaulten.

Filnavnet blir stående som kilde på hvert kort, så gi dem navn du
kjenner igjen:

    IN1020-eksamen-V24.pdf
    IN1000-eksamen-H23.pdf

Er PDF-en skannet — altså bilder av sider, ikke tekst — får scriptet
nesten ingenting ut, og sier det. Da må den OCR-es først.

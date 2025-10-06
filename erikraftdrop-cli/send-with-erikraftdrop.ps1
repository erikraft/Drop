$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

& "$scriptDir\erikraftdrop.sh" $args


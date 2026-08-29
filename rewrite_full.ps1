$env:GIT_AUTHOR_NAME="krishty21"
$env:GIT_AUTHOR_EMAIL="krishtyboy21@gmail.com"
$env:GIT_COMMITTER_NAME="krishty21"
$env:GIT_COMMITTER_EMAIL="krishtyboy21@gmail.com"

$commits = @(
  "97c26e6e10a85df48be15b3204a33dd95b95d606",
  "fce362a149fd4fc21282c033a6dbaee13857a4a0",
  "dc4065d71c77cc5c61319835454648f45950434a",
  "57db335bd4b63be76be434351b143783678c5c23",
  "d26bf3e47c56fd09bf8f5440e3428d92f046e1c6",
  "bb917bcc4a6852332bc9258b97276642b1f0921b",
  "4000b94cda0418473bb4056e10826c8eef2c6753",
  "6748afca8f3af0c6ae8e3a24196d6c8c96ac2df9",
  "c567ad2e2b70de9f5e307e18cae769857d3509b2",
  "b58df0664b008431e8bfc4e72631e6c89b946b52",
  "16254ff8aa0c785157e9e709a9c6e0743ad63421",
  "00bad1ef4dd5e150d3f04a57a24db1bc5d7cecee",
  "0890d227bcbcc8d0605dc964fcf850fe2c645279",
  "ead0ef2428551507ef59964037c20d133ec6bb21"
)

$messages = @(
  "Initialize project setup and dependencies",
  "Setup core application UI components and API routes",
  "Add admin analytics charts and update verification UI",
  "Implement WebSocket notifications and error boundary pages",
  "Create jobs board UI and add pending verifications seed",
  "Build application ratings panel and summary components",
  "Implement candidate filters and top-rated badges",
  "Add trust timeline and employer reputation scorecards",
  "Update KaamCard components and internationalization strings",
  "Implement similar jobs suggestions and API endpoints",
  "Add application withdrawal flow and tracker timeline updates",
  "Final UI polish across dashboards and documentation updates",
  "Extensive UI refactoring and internationalization improvements",
  "Refine global styling, UI components, and layout configurations"
)

$parent = ""
for ($i=0; $i -lt $commits.Length; $i++) {
    $tree = git rev-parse "$($commits[$i])^{tree}"
    
    # Get original dates
    $env:GIT_AUTHOR_DATE = git log -1 --format="%ad" $commits[$i]
    $env:GIT_COMMITTER_DATE = git log -1 --format="%cd" $commits[$i]
    
    if ($parent -eq "") {
        $parent = git commit-tree $tree -m $messages[$i]
    } else {
        $parent = git commit-tree $tree -p $parent -m $messages[$i]
    }
}
git update-ref refs/heads/main $parent
git reset --hard main

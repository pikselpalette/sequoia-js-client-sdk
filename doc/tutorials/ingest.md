This tutorial is based on [this](https://gitlab.piksel.com/experiencements/cablelabs-scsdk-ingest/blob/master/lib/ingest.js) project.

Assuming we already have a populated `client` instance set up, we can create a
bunch of ResourceCollections that we'll populate from parsing our ingest input
files.

```javascript
const metadata = await client.service('metadata');

const collections = metadata.resourcefulEndpoints('assets', 'categories', 'contents', 'credits', 'offers', 'people', 'roles')
  .map(resourceful => resourceful.newResourceCollection());

const [assets, categories, contents, credits, people, roles] = collections;
```

You'll notice we only requested a subset of [metadata's resourcefuls](https://metadata-euw1shared.sequoia.piksel.com/docs),
as these are the only one's we're interested in.

If you wanted to make sure you didn't have any name collisions, you could
instead use collections that are pre-populated from the existing data within
sequoia:

```javascript
const collections = await Promise.all(metadata.resourcefulEndpoints('assets', 'categories', 'contents', 'credits', 'offers', 'people', 'roles')
  .map(resourceful => resourceful.all()));
```

Let's use the [CableLabs](https://community.cablelabs.com/wiki/plugins/servlet/cablelabs/alfresco/download?id=0f373664-9a8c-40a3-a284-20ef75766490)
spec for creating a naïve ingest script based on an XML file being made
available to use and us reacting to it.

Transforming the XML in our JSON based Resourcefuls is out of scope for this
tutorial. The [example] project uses [xml2json](https://github.com/buglabs/node-xml2json)
but you may wish to transform larger files by using [xml-stream](https://github.com/assistunion/xml-stream).

Assuming we have the following methods that can parse the XML into the correct
Resourcefuls:

```
function getContentJSON() { return { ... }; }
function getAssetJSON() { return { ... }; }
function getCredits() { return { ... }; }
function getOfferJSON() { return { ... }; }
```

we can start to pick apart the CableLabs document into proper Resourcefuls as
part of the collections we made above.

Assuming we've used [xml2json](https://github.com/buglabs/node-xml2json),
we'll have POJO that has its first key as `Asset` which is an array of the
assets specified in document. Let's extract some things we want to use:

```javascript
const [assets, categories, contents, credits, offers, people, roles] = collections;
const { Asset } = json;
```
and make a convenience method for getting certain Assets from the original
document by their specified ID:

```javascript
const findById = id => Asset.find(a => a.uriId === id);
```

A CableLabs document can have one or more `Offer`s specified. These cover the
actual Content we want (e.g. a Movie, Show, Series or Episode that we're
trying to ingest. Each offer will have a ContentGroup associated with it, that
tells us which of the rest of the `Asset`s relate to this piece of content
(box art, video files, trailers, offers etc).


```javascript
Asset.filter(a => a['xsi:type'] === 'offer:OfferType').forEach((offer) => {
  // For each offer, we get the content group so we can find the relevant
  // information. Note, we're ignoring the PromotionalContentGroup for this example
  const contentGroup = findById(offer['offer:ContentGroupRef'].uriId);

  // Terms will give us availability windows, pricing, billing grace periods, viw windows etc
  const terms = findById(offer['offer:TermsRef'].uriId);

  // Now we can get the title information - our metadata/contents item
  // Assuming there is one title per content group...
  const title = findById(contentGroup['offer:TitleRef'].uriId);

  // Movie, Preview, BoxCover are all 'assets', so collate them:
  const incomingAssets = ['Movie', 'Preview', 'BoxCover'].reduce((acc, assetType) => {
    const ref = contentGroup[`offer:${assetType}Ref`];
    (Array.isArray(ref) ? ref : [ref]).forEach(a => acc.push(findById(a.uriId)));

    return acc;
  }, []);
```

At this point we've created and collated all the relevant information for each
content item we want to ingest, with all the relevant information for related
`Resource`s (such as assets, offers, credits etc) and we can now turn these
into proper Sequoia Resources added to our collections in readyness for
importing.

Each of these related resources will be `link()`ed to our main `content` item.
The `Resource#link` method can handle direct or indirect relationships - i.e.
it doesn't matter from which side of the relationship you call `link()` on.

```javascript
// Create our content item
const content = contents.findOrCreate(getContentJSON(title));

// Create our assets and link them to the content:
incomingAssets.map(asset => content.link(assets.findOrCreate(getAssetJSON(asset))));

// Now create the categories:
// Note, for simplicity we're not creating the parent category from the
// 'offer:CategoryType'
[].concat(title['title:Genre']).forEach((genre) => {
  const name = normaliseName(genre);

  const category = categories.findOrCreate({
    name,
    title: genre
  });

  content.link(category);
});

// And now the credits:
getCredits(title['title:LocalizableTitle']).map(credit => credit.link(content));

// And finally the offer. An offer represents the pricing and availability of
// this piece of content
content.link(offers.findOrCreate(getOfferJSON(terms)));
```

And now we finish off by closing our `each` statement and saving the
collections:

```javascript
});

return Promise.all(collections.map(c => c.save()));
```

Done. Our `collection`s will make sure to batch themselves to the right size
before saving to the Sequoia services.

Please review the sample project for more information.


# Deleting old content

Deleting all the content that matches certain criteria is as simple as:

```javascript
contents.all(where(field("availabilityEndAt").lessThan("2017")))
.then(resourceCollection => resourceCollection.destroy());
```

Here we found everything that went out of availability in 2017 and deleted
it.

# Salesforce component customisation chat with architect (Eddie) – date not stated (Transcript)

*Speakers are inferred from context and may be wrong in places; words are unchanged from the recording apart from four corrected mishearings (SLDS, Lightning Web Runtime, header, nav bar). A second team member was present but not named; all non-architect turns are attributed to Mason.*

## Session starts: Eddie (architect) joins

**Mason:** Sorry, anywhere, we're still downloading about the sprint planning. How you doing?

**Eddie (architect):** Good, good, good, good.

**Mason:** Cool. Okay, so let's jump into it. So yeah, Eddie, I was trying to grab a little bit of your time to, um, to, to talk theming of salesforce and customisation. So, Um, I had a brief chat with Simon. I can't remember his last name this morning about it as well, but I know he's taking off on leave. So I was trying to, like, a little bit of info from him before he took off. But essentially we're trying to understand, you know, from a design perspective, how far Can we go with customising components and layout before it's too far? You know, what is an acceptable amount of customisation? And I think, you know, because I've got a front-end depth background, I've been jumping in and spitting up a lightning web components, Lightning Web Runtime, kind of testing out, running a few components and skinning them and seeing what it's like. Looking at some of the kind of the guidelines. And I'm starting to get a bit of a, an idea that, you know, it's, the business seems to believe that it's just a matter of, let's just take some Lego off the shelf and piece it together and then that's, that's what we get. Anything beyond that is kind of customisation, but that's not kind of how I'm reading it. that there's this, you know, in order to actually style it like a website that we've, there's a certain amount of work that goes into still kind of doing custom styling and so on. Um, But there's a line, you know, there's a line at which we kind of can't cross it or when we need to kind of raise it as being, this is a high effort. You know, that's a kind of question of effort rather than like whether or not we should be customising or how much, yeah, just interested in your thoughts there.

**Eddie (architect):** Oh good. Good, good, good. Just trying to gather my thoughts there. I think as far as, like, theme, I think it's just, it's... Anything wherein you're changing, I guess, I wouldn't call this, like this, the basic structure, I guess, a particular component? I think that's customisation, right? Like, if you were expecting, like, let's say, like, how would my experience? Okay, let's say the record detail page, right? Like it has a standard basic structure, right? Like you have your left, right? You have your labels and your fields, labelled in the fields, yada, yada. If you want anything other than that particular struct, if you want to change the colour, the padding and all that, I'm pretty sure we can accommodate that or you can, you can skin it to, to have a specific padding, to have a specific spacing, potentially even fonts and all that. But if you want to change the, like, the generic, the logical structure of that component, then that would require customisation. For example, it's...

**Mason:** I'll bring it up. I think it'll help if we can... What I'm bringing up is we've kind of done some initial wire frames. I think it's probably the easiest thing to just like, okay, these are, these are some things we've created out of some of the lightning web components. And this is like, you know, how to go at building this. It's basically, it's a card component with some custom layout in it. Um, or just some lightning layouts. It's some buttons, fields, some text, you know, it's all just using kind of lightning layout to lay out the grid. But it's pretty, you know, in terms of the components, it's pretty much off the shelf components, aside from the header.

**Eddie (architect):** Yeah. So, go away, I would look at this.

**Mason:** So we're purposely not theming it, like not designing, like not doing any kind of skinning on this in this version.

**Eddie (architect):** Um, I would probably think this would be custom, but if you already use standard components, that makes us heat. Let's make it a lot easier on the development side. Because that means we don't have to kind of like, like pixel by pixel or like crate and new component so we could just use it off the shelf. Not really off the shelf. But sort of like your standard libraries in LWC to kind of make this happen. But also this is not, you know, it's not exact, it's not entirely complex. It's just a repeat there.

**Mason:** It's a repeater.

**Eddie (architect):** Yeah. They're feeder with like in like hearts inside of it that just basically beats data from the back end. So it's not, it's not that crazy. You know, technically we would still call it customisation, but as far as, like, how hard is it from a development perspective, it's not, it's not, it's not entirely hard to do it. It's not entirely like crazy amount of customisation. Like, for example, this page, like the page that you're looking at, this will possibly look, because we have this concept in, like, community cloud. You have, like, you have your, like, your basic pages, which is just pages. You can put anything you want with it. Then you have like record pages where you have like the detail in the list view, which helps because it already has the context of that record or that data. Like if it's a detail, you have the context of that record. For example, a vacancy, you have the context of that record inside of it. So, like, most of the customisation will most likely be a little bit on the front end, a little bit of the saving and everything, but like the retrieving of the records will already be kind of, there will be standard sort of methods that we can already use, and retrieve the records, and really helps, as well, I think, in this one, which is here, I would assume this is kind of like a list view or a related, what do you call it, a list? page, where it has the politics of, let's say, the object, that it is based on, for example, this one is really vacancies. So for that, we, we, same thing, there's already an element of, uh, reuse, uh, that we can sort of like we don't have to build everything from scratch. The UI will still most likely going to be LWCs, but as I mentioned, it's not entirely. You know, we're not creative. not rocket science, in fact. It's still custom, but it's still gonna be, I guess, within the boundaries of, you know, what is acceptable levels of customisation.

**Mason:** Okay. And could you could you unpack its custom but within the boundaries of acceptable amount? Like what, which parts of it are custom? Like if we've got the these, you know, obviously the layout blocks, you know, this is your... But the components themselves are all should be kind of off the shelf components. Off the shelf. So... With a little bit of configuration, I'm guessing, for the card, potentially, but.

**Eddie (architect):** Yep, so, so what I mean by that is that, for example, this block that you have here, because you mentioned that you're using standard SLDS components, right? Yep. So, what I meant by that is that we're not, like, creating a pixel by pixel, like, we're not creating, like, for example, we're not creating a box with some texts that they have for outlining, like, the positioning of that section, that the detail part, we're basically saying that this is a standard component. We will just kind of plug in the data into this part, basically plugging it that they, let's say, sign 4 person, are just gonna map it to vacancy.maid. And all of the sections at the bottom, we can just map it to specific fields in the vacancy. So we're not, like, rendering that box, like, rendering that box, rendering that title, rendering the bottom, or the arrow, in the, in the, in the lower right hand side, so we're not building everything in that, that is within that box. You're basically reusing component and saying, for this component, use this particular record or prove this particular row. So that's what I meant by now. So you're not rebuilding everything, so, but, so, or commoded by component, basically using a building block, then you're just going to say, hey, this is the data, I said to you. That makes sense.

**Mason:** Yep. Yep, totally. Yeah. It's same with... Yeah. I think that's how the Codwicks is enough, so we can have the arrow is on the right. The label, obviously, the labels are a piece of custom code, but that's ejected into a spot where you can have media in that top right, top right, and it will pop the left there. You've got an icon and text combination, but text is an element or a specific field that's in the vacancy form, we can say.

**Eddie (architect):** Active dates, or, sorry, managed by a standard text, inform the builder of the text that is the 1st name survey. That kind of thing.

**Mason:** That kind of thing, yeah. Yep. Okay, I thought we can then have, uh, forth that come from the star sheets. Colours that come from the colour library, padding that is pint.

**Eddie (architect):** Definitely. Yeah, like the, the 4 billion. What do you call that? Like the portal theme, I guess.

**Mason:** Yeah, of course. So it's coloured library.

**Eddie (architect):** Yep, yep, yep. Cool. Yeah, the colour is there, colour, all that, chips.

**Mason:** Yep. Do, um, so this is just some little, you know, looking into the CSS, so it's just playing, having a look through. So, you know, Just they're looking at theming a button. Okay? So, you know, using component hooks to to to style the different elements of a button. This is just that kind of makes sense. You know, that appears to be pretty kind of just using global hooks or component hooks. So is all... acceptable amount of kind of theming. That's kind of the same. There's, I had an example up here. This is an example of like, okay, says a custom, custom class. I wanted to create a new listing chip. Um, and it's using it's using existing tokens from badges, but it's it's creating a, you know, a custom class for that thing to style it in a particular way. So that's that's probably what we'd be using for that. You know, that, that, you know, those badges. So that's kind of, you know, that's a layer of CSS that you would be wrapping over the top of the of the stuff, but it's not just setting hooks. So is that inacceptable amount of custom?

**Eddie (architect):** Yep. Definitely.

**Mason:** Okay. We just, for context, we've been giving very specific instructions around kind of, um, more of a call, well, what's been turned custom versus kind of off the shelf. And I think what we've discovered in the nicest, the covers, it's not a, it's not a hard line. Like, this is custom, this is, you know, you say in that instance, you're creating those chips, they have to be created from something, they're created from styles. But it's kind of a component, but it's not really a functional component. It's not.

**Eddie (architect):** So, like, it's still custom. There's customisation, right? Yeah, and I think of the experience cloud science, it's very hard. to get away from custom custom components.

**Mason:** Right.

**Eddie (architect):** Just because it adds different sort of, um, it gets feasibility requirements. And, But, yeah, it's already shown there, if as long as, like, year old, as long as that we're kind of aware of, like, the existing sort of, like, component libraries that are available to us with lining, like, proponents. Then that kind of goes along. It does make the development process a lot. just easier and a lot more faster because we're not, as I mentioned, so if you're not building each of the different components line by line, like you're not building a box line by line. You're not fiddling around with the positioning of that particular label. It has a predefined position. You're just plugging in the data and probably the colours and pop up. That kind of thing..

**Mason:** This page would be the, like a detail, vacancy detail. And, you know, they weren't, you know, what, you know, we're not using a lot in the way of out of the box components here. But it is using, you know, the badges out of the box, the typographies out of the box, that, you know, it's just quite a, it's just a bit of, probably, mostly HTML to just lay out. Yeah, it's not. not super complex, but it's it's not it's not off off the shelf, right?

**Eddie (architect):** Yeah, but it's, it's, you know, it's, It's nothing that scares me. Try the levels of customisation. Because it's playing information in a certain way, with a certain layout. If you look at it, it's just 2 columns. You have, like, a side, like a left side bar with specific, and if you're already using the badges and the filths, and then it's nothing too complex there.

**Mason:** Yeah. Is there anything any calls that call outs there around fonts or it's not fonts? I'm sorry icons. I gathered, you know, there's a there's an existing supported icon library that we can use, which I'm using in this one.

**Eddie (architect):** Um, For using custom icons. Are we expected to use custom like us, by way?

**Mason:** I, I don't know if it's expected. It's more just like in our original design system, we've got a whole suite of custom custom icons, which we'd love to utilise.

**Eddie (architect):** Uh, yep, verify that for you. Not too sure, to be honest, about, like, if there are standard icon libraries and salesforce.

**Mason:** Yeah, there was there was this one, which apparently is a standard. Um, icon library, um, What's the, ah, anyway, this is, I've got the, the icon, I don't have the library open, sorry, but yeah, there's a there's an icon library that comes with the SLDS.

**Eddie (architect):** Okay. What's the name of the library?

**Mason:** I'll just have to track it down. I just don't have it in front of me, sorry.

**Eddie (architect):** Okay, cool. And I'll double check that for you. That's something that I we can reference in LWC quite easily. They're, like, standard components that could use for them.

**Mason:** Yep. And so I think, if we, you know, based on that, the general guidelines, you've given us there. If we were to, you know, use, set up a lightning web runtime site, using lightning wave components out of the box as much as possible, wrapping some simple CSS or customisation there around those things. And give that to you guys to help kind of with that handover. Is that something that would be useful? and is that kind of a realistic? Would there be any major translation of that to the build?

**Eddie (architect):** I don't think so.

**Mason:** Okay.

**Eddie (architect):** I think so. If I feel already kind of take in consideration, the use of, let's say, dirt, technical, lightning, caponent, SLDS, components, and SLDS, sort of like basic library items, it can't be too bad.

**Mason:** Okay. Um, I wonder if there's any, any, I guess the, like we talked about the header was the, was the one, was the header in the foot, the 2 things that we kind of called out as being, and you obviously found something that was in the, in the kit that we didn't, we didn't see was there.

**Eddie (architect):** Oh, yeah, I was, basically, just, uh, we just, I just used the standard nav bar.

**Mason:** Yeah.

**Eddie (architect):** And that's never, that's configured it to like a certain structure. Oh, yeah. I didn't spy it or anything. Yeah, I'm pretty sure you could style it, like, as far as, like, um, like fonts and colours and whatnot. But the general structure is what I've kind of posted in there.

**Mason:** Yep. So would you use a thing?

**Eddie (architect):** So, I think what I found there is that, like, the top, like, for example, you have like the drop down there. So how it works, like, how it works, the link will just be a way to navigate to the sub pages or to the sub navigation items? But it can't be a link to another page, if you come with me. Like, Like, how it works is basically like a navigational item with an app or, but it can't redirect to another page. All of the pages will be have to be the icons below it.

**Mason:** Okay. That makes sense. Yeah. And but do you get the way you have it here, which is just a left, left or line. fine. And we would, you know, our original designs, we had a, like an account nav, or the drop down. You know, main nerve with dropdowns and sub dropdowns. you know, kind of collapsing down. That's not very good representation of that.

**Eddie (architect):** Um, it, it, it, it, it, it, like the, with the active organisation in the portal, by agent, like who you are logged in for. Is that gonna be displayed, like, as a strip or something?

**Mason:** But that's a good question, actually, because I talked to you about that earlier on. So at the moment, we're showing on the homepage on the landing page. But I think what we talked about later on was like having it somewhere so that it potentially could be used as a fresh switcher in the future.

**Eddie (architect):** Is it an organisation or US question? We're just as like, it just lead to an active, sort of reminder that you are like not, as this kind of thing, right? Could it be just even be just a simple text somewhere? Like, your luckiness, what is it?

**Mason:** Yeah, yeah, we have talked about that. as a switcher control. Um, okay, and so would you consider, like, it sounds like there are base components you can leverage for some of this header stuff, it's particular in that, that is, um, responsive, is that, is that, is that kind of getting into the slightly more effort of customisation to kind of set that up or is that just still kind of in that same, same round?

**Eddie (architect):** I can barely have more. The box combined, they hit on their bar. Oh, no, that's the standard, like the NAPR showed you, was the standard. So, if you want to customise it, as far as I say, colours and points.

**Mason:** Yep.

**Eddie (architect):** Sure, just way to do that.

**Mason:** Okay. Okay, this has been very useful. I'm sure we'll have plenty more catch ups on this, but I appreciate that just to give us a bit of a stare.

**Eddie (architect):** No worries. Awesome. Hey, thanks guys. Chat again soon.

**Mason:** Thanks again.

**Eddie (architect):** Cool. Thank you.

**Mason:** Thanks, mate. Bye.

**Eddie (architect):** Bye.

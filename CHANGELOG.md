# IBI eCommerce Marketplace — changelog

> Generated from `window.IBI_VERSION_NOTE` in `index.html`. The page keeps only the 12 most recent entries (they render as the version badge tooltip); everything else lives here.

## v12.15

🔑 SELLER LOGIN AND “MY PRODUCTS” NOW WAIT LONG ENOUGH FOR THE SHEET TO ANSWER. Signing in to Seller Central often failed and said the server could not be reached, and the product list either sat on “Loading…” or quietly showed an older copy. The account and the PIN were never the problem. Every Seller Central request was giving the Google sheet between six and ten seconds to reply and then throwing the answer away, with no second try. Timed on the live system this morning, the same sign-in request came back in 9 seconds, then 22, then 77, then 6, then 3 — so the reply was usually still on its way when we stopped listening. Sign-in, the product list, opening a listing to edit, orders and earnings now wait up to 25 seconds and try three times before giving up, which is what the shop front was already doing for customers. While it waits it tells you what is happening instead of sitting silent, and if it truly cannot get through it now says the sheet is busy rather than blaming your connection. Three related things were put right at the same time. A warning that the list was a saved copy rather than the live one had been written into a box that did not exist on the page, so nobody ever saw it — the box is now there, and it also says when a retry is under way. A failed load can no longer overwrite your saved copy with an empty list, which is what could make the next visit open on an empty shop. And the orders page no longer reports “no orders yet” when what actually happened is that the sheet did not answer. Pausing and deleting a listing also wait longer, but they are still sent only once, because a request that timed out may already have been carried out and must not be repeated.

## v10.9

🏷️ THE BADGE NO LONGER FLASHES “v4.15” BEFORE SETTLING ON THE REAL VERSION. You spotted it on a hard refresh, and you were right to ask — but nothing was wrong with the update: the page was showing you a number that had been sitting in the page itself since April and was never changed again. The badge is written into the page as plain text, and the small script that replaces it with the CURRENT version sits about 430 lines further down. A browser draws the page as it reads it, so it painted the old “v4.15” first and only swapped in the real version a moment later when it reached that script. Normally the page is already cached and that moment is far too short to notice; a hard refresh throws the cache away, so reading the page takes longer and the flash becomes visible. The badge is now left EMPTY in the page and filled in only by the script, so a wrong version can never be shown at any point — you will see a blank badge for a fraction of a second, then v10.9. Checked the rest of the page for the same kind of stale leftover: the only other one was the “All Products (343)” heading, already fixed in v10.7.

## v10.8

🔀 THE HOME PAGE NOW FOLLOWS YOUR ARRANGEMENT EXACTLY, ROW BY ROW. After v10.6 the order was being honoured almost everywhere — “All Products” listed your 16 products as 1, 2, 3 … 16 — but the “New Arrivals” strip printed its four products BACKWARDS: it showed your #16 Coir Rope, #15 Broom Sticks, #14 Palmyrah Brush, #13 Coir Brush, in that order. The reason: that row was written to show the newest listings first, and it worked out “newest” by taking the catalogue from the BOTTOM UP — which was fair enough when the list always arrived in the order things were listed, but stopped being true the moment v10.6 made the shop respect your own arrangement. Position now means where YOU put a product, not when it was listed, so reading it backwards produced an order nobody had asked for. It no longer reverses anything: the row shows your #13, #14, #15, #16 in your order. So the full home page now reads: Featured Products = your #1 to #12, New Arrivals = your #13 onwards, and All Products = all of them, 1 to 16 — every one of them in the order you set in 🔀 Arrange order. Note on the split: with 16 products the Featured row fills up with the first 12 and the rest flow into the next row; if you want a particular product on the home page, put it in your top 12.

## v10.7

🛍️ FIX: THE SHOP SOMETIMES SHOWED NO PRODUCTS AT ALL. Measured on your live site: the shop asks Google Apps Script for the product list, and five requests back to back took 2.2, 2.4, 2.6, 5.7 and 11.0 seconds. The app gave up after 10, so roughly ONE VISIT IN FIVE hit the slow one — and when that happened the code simply stopped, with no retry, no message and nothing on the page. Since the old demo products were removed, that left a completely empty shop reading “Showing 0 of 0 products”, exactly what you saw. Nothing was ever wrong with your listings or the sheet. Three changes. (1) The app now waits 15 seconds instead of 10, which covers the slow tail. (2) If a request still fails it AUTOMATICALLY TRIES AGAIN, up to three times. (3) If all three fail, it falls back to the last catalogue that loaded successfully on that device, with an honest amber note saying so and a “Try again” button — and if there is no saved copy either, it says “Could not load the products” with a Try again button instead of showing an empty page. ⚠ Deliberately NOT cached over: an answer that genuinely says “this shop has no products”. That is a real answer and is shown as-is, so deleting listings can never be undone by an old saved copy (the trap fixed in v10.3). All five situations were tested: normal load, everything failing with no saved copy, everything failing with a saved copy, a genuine empty shop, and a request that fails twice then succeeds. ALSO FIXED: the “All Products” heading always read “(343)” — a leftover number from the old demo catalogue that was written into the page and never updated, which is why the heading claimed 343 while the line beside it correctly read 0. It now shows the real count.

## v10.6

🔀 FIX: “Arrange order” SAVED but changed nothing on the storefront. Your arrangement was never lost — the sheet had it stored correctly all along (positions 1 to 12) — the shop simply was not reading it. When the storefront loads, it first groups variation families and, at the end of that step, takes a SNAPSHOT of the product list; every row a shopper sees (Featured, New Arrivals, All Products, a seller store) is drawn from that snapshot. The sorting ran one line LATER, so it reordered the real list but not the snapshot that had already been taken — the shop went on showing the order the products happened to sit in on the sheet. The two steps are now the other way round: sort first, then snapshot. Checked against your live shop: it was showing Therali, Stone Diya, Achu, Mars… (sheet order) and now shows your saved 1-to-12 order — Stone Diya, Therali, Biryani Leaves, Men’s Cotton Polo, Mars Polo, Achu Murukku, Tea Mug, Food Strainer, Square Tray, Coir Brush, Palmyrah Brush, Palm Leaf Sulavu. TWO smaller faults in the same feature are fixed too. (1) After pressing ✔ Save order, the new positions were written to the wrong place on your device — a name nothing ever reads — so the saved copy still held the OLD positions and going to another tab and back to My Products repainted the order you had just replaced. (2) That saved copy is stored in sheet order, and My Products painted it as-is for the second it takes the sheet to answer, so the list visibly jumped. Both now use the same name and the same sorting, so what you arrange is what you see, immediately and after a refresh.

## v10.5

📋 ONE SPELLING SLIP NO LONGER HIDES A PRODUCT YOU HAVE LISTED. Found while re-checking the Catalogue Tracker with the corrected master: your new Biryani Leaves listing was sitting in 🕐 Pending even though it is live. The catalogue name is “Biriyani | Rambai | Pandan Leaves, 10 Qty Pack, 1 Qty” and the listing carries Rambai AND Pandan AND Leaves — three of the four identifying words — but it spells the fourth “Biryani” instead of “Biriyani”. Because that was the rarest word in the name, the tracker treated it as the one word that MUST appear and refused the whole match on a single missing letter. Now two of the near-rarest words matching counts as evidence just as strong as the single rarest one. Ordinary words can never satisfy this — “natural”, “coconut” or “leaves” appear in dozens of your names and rank nowhere near the top — so the checks that stopped the wrong ticks in v10.3 are untouched: “Natural Organic Coconut Husk” and “Hibiscus Leaves” are still correctly Pending. Checked against all 12 live listings and all 268 names: 34 Completed, every one of them verified as a real listing or a real variation of one, and nothing that was correct before was lost.

## v10.4

🗂️ PRODUCT CATALOGUE REFRESHED TO 268 NAMES, straight from your two master spreadsheets (IBI_Complete_Product_Master_HSN_GST.xlsx and List of Product Names — they hold exactly the same 268 names, so it does not matter which one you upload to the 📋 Catalogue Tracker). Three things changed. (1) NEW: “Therali Leaves, 100 Qty Pack, 1 Qty” — it was in your spreadsheet but in none of the apps, so it could not be picked from any product list. (2) CORRECTED: the Dog Chain was still recorded here at the old size “170x10x 2 cm”; it is now “170x2x2 cm” as your master says, on both the 1 Qty and the 2 Qty entry. (3) ⚠️ FIXED A GST TRAP: the HSN code for both Therali Leaves rows is 07099990, but in the spreadsheet those two cells are stored as NUMBERS, and a number cannot begin with a zero — so Excel is holding 7099990 and the leading zero is gone. The app now carries the correct 8-digit 07099990. **Please repair it in the spreadsheet too** (cells C221 and C222 of the “IBI Product Master” sheet): format them as Text, then retype 07099990 — otherwise anything else reading that file gets the wrong code. Every other HSN in the file is already stored as text and is fine. The same 268 names were pushed to all the other tools that carry the list — the ✨ AI product-name box here, the Listing Generator, Order Processing, Returns Logger, Dimensions Logger and Stock Availability — so they can no longer disagree with each other.

## v10.3

📋 THE CATALOGUE TRACKER WAS COUNTING THE WRONG THINGS, in three separate ways. It is fixed and now reports what you have actually listed. (1) DELETED LISTINGS KEPT COUNTING. When the sheet answered “you have no listings” — exactly what it says right after 🗑️ Delete all listings — the app treated that as a failed call and quietly put its saved copy of the OLD list back. So the 52 listings you deleted went on being ticked off as ✅ Completed. An empty answer is now taken at face value; only a genuine no-reply/timeout falls back to the saved copy, and it says so. The Catalogue tab also re-reads your listings from the sheet EVERY time you open it (and has a 🔄 Re-check button), instead of trusting whatever was left in memory from before — that is why a delete made in one tab never reached the tracker in another. (2) PRODUCTS YOU HAD LISTED WERE STILL SHOWN AS PENDING. A colour × size listing (9 shirts in one listing) counted as ONE product, because the tracker only understood a Quantity axis and ignored every other kind of combination. It now reads each combination’s own name — which is normally your catalogue name word for word — so all 9 Mars Polo shirts and all 3 Men’s Cotton Polo shirts are correctly Completed. (3) PRODUCTS YOU HAD NEVER LISTED WERE TICKED OFF. The name-matching was too loose: “Natural Organic Coconut Husk” was marked Completed because a Coir Brush listing happens to contain the words “natural” and “coconut”, and “Hibiscus Leaves, 50 Qty Pack” was marked Completed against Therali Leaves because both say “leaves”. Matching now weighs each word by how rare it is across your list — “aluminium” is in a dozen names and proves nothing, “sulavu”, “husk” or “hibiscus” names the product — and a match is refused unless that identifying word really is in the listing, the pack quantity agrees, and the dimensions do not contradict. Duplicate variation rows can no longer grab a second name either. On the live catalogue the count went from 25 completed (3 of them wrong, 12 real ones missed) to 32 completed, all verified correct. The summary line now also states how many live listings it compared against.

## v10.2

🔒 EVERY OWNER-LEVEL CONTROL IS NOW BEHIND THE SAME PIN, not just the two delete buttons. I went through Seller Central tab by tab and found two more things staff could reach. (1) 📋 Catalogue tab → “🗑 Clear list”, which wipes the uploaded product-name list — now hidden unless the PIN is entered. (There is no “Delete all listings” button on that tab; Clear list was the destructive one there.) (2) 👤 Profile tab → the whole “💾 Data Backup & Restore” card: Restore OVERWRITES the saved data on the device, and Download exports a snapshot of your products, orders and catalogue — both are owner jobs, so the card is now hidden too. All of them obey the same rule as the delete buttons: invisible until you click “iINTELLIGENCEi” top-right and enter the PIN, visible for 15 minutes, and the actions themselves re-check the unlock so nothing can fire from a stale button. Left alone on purpose, because staff need them for everyday work: “Discard” a half-finished draft, “Reset” the Add-Product form, removing a photo or a variation row while editing, and Sign Out.

## v10.1

🙈 THE PIN IS NOW HIDDEN AS YOU TYPE IT. The owner unlock used the browser’s own pop-up box, which shows whatever you type in PLAIN TEXT — “8899” sat there on screen for anyone standing behind you to read, and a browser box cannot be masked. It has been replaced with IBI’s own PIN box: the digits show as dots, the browser is told not to remember or offer to save it, and the number is wiped from the page the instant it is checked. Press Enter to confirm, Esc or Cancel or a click outside to dismiss — and it still says only “Enter PIN”, never what it unlocks. v10 — 🔒 DELETING IS NOW OWNER-ONLY AND INVISIBLE TO STAFF, and 👁️ PREVIEW NO LONGER SIGNS YOU OUT. (1) “🗑️ Delete all listings” and the “🗑️ Delete” button on every listing are not shown at all any more. Staff working in Seller Central do not see that deleting is even possible — they still have Edit, Pause, Preview and 🔀 Arrange order — so a listing cannot be lost to a mis-click or a curious click. To reveal them, click your account name “iINTELLIGENCEi” in the TOP-RIGHT corner and type the PIN. It looks like ordinary text — no button, no underline, no tooltip — and the box just says “Enter PIN” without saying what it is for. Once unlocked the delete buttons appear for 15 minutes; clicking the name again hides them at once, and they hide themselves on sign-out, on closing Seller Central and on a page reload. The delete actions re-check the unlock themselves, so an expired session can never delete. ⚠️ Be clear what this is: it HIDES the controls from staff, which is what was asked. It is NOT a security wall — anyone who can sign in to the seller account could still reach the delete function another way, because the server checks the SELLER’s PIN, not this one. Real enforcement would need a separate login for each staff member. (2) FIX: previewing one of your APPROVED listings quietly SIGNED YOU OUT of Seller Central — the preview closed the dashboard instead of minimising it, which clears the login — so “← Back” had nowhere to return to and dumped you on the public storefront. Preview now keeps you signed in, the button reads “← Back to Seller Central”, and it takes you straight back to My Products.

## v9.9

🔀 YOU CAN NOW ARRANGE YOUR LISTINGS IN ANY ORDER YOU LIKE. Seller Central → My Products has a new “🔀 Arrange order” button. Press it and every listing shows its position number with three controls: ⩲ sends it straight to the top, ▲ and ▼ nudge it one place, and you can simply DRAG a card and drop it wherever you want it (dropping moves it to that position — it does not swap the two). So bringing your 3rd listing to 1st, or your 9th to 1st, is one click or one drag. Press “✔ Save order” and that becomes the order SHOPPERS see on the storefront — in Featured Products, New Arrivals and All Products alike. Cancel changes nothing. Your own My Products list is shown in the same order, so what you arrange is exactly what you see. A listing you have not arranged yet always sits AFTER the ones you have, in the order it was listed — so adding a new product never barges into the front of a shelf you have carefully laid out; drag it up whenever you want it there. ⚠️ THIS ONE NEEDS THE BACKEND UPDATED: the order is stored in a new “Sort Order” column (26) in the product sheet, so IBI_Seller_Backend.gs must be re-pasted into Apps Script and re-deployed before Save will work.

## v9.8

🗂️ FULL AMAZON-STYLE CATEGORY LIST. ② Category went from 8 departments (only Jewellery had shelves under it) to **16 departments with 79 shelves**, modelled on Amazon India: Electronics · Clothing & Fashion · Home & Kitchen · Grocery & Food · Beauty & Health · Jewellery · **Pet Supplies** · Baby Products · Toys & Games · Sports & Fitness · Books & Media · Car & Motorbike · Office & Stationery · Industrial & Scientific · Musical Instruments · Handmade & Handicrafts. Each one is a proper heading in the dropdown with its shelves indented under it — Pet Supplies has Pet Food & Treats, Pet Accessories, Pet Grooming, Pet Toys, Pet Beds & Housing; Home & Kitchen now has Kitchen & Dining, Cookware, Storage, Décor, Furniture, Bedding, Cleaning, **Pooja & Spiritual**, Garden and Tools. Start typing in the dropdown to jump straight to a shelf. You can still pick just the department (“Home & Kitchen — all”) if none of the shelves fit. Every existing listing keeps its category exactly as it was — nothing was renamed or removed. Two things that were quietly broken are fixed too: (1) picking a shelf used to HIDE the product from its own department — a listing filed under a Jewellery shelf did not appear when a shopper filtered by Jewellery, because the filter demanded an exact match; a department now includes everything on its shelves. (2) The category list existed in three separate places in the code that had already drifted apart (the seller dropdown offered 8, the home page tiles showed 10, the filter buttons showed 5) — all three are now generated from ONE list, so they can never disagree again. The home page tiles and filter buttons also only show departments that actually have products, instead of opening onto an empty shelf.

## v9.7

🏠 THE SAME PRODUCT NO LONGER APPEARS IN THREE ROWS ON THE HOME PAGE. “Featured Products” and “New Arrivals” were both just taking products off the top of the catalogue — Featured showed the first 12, and New Arrivals had no real “new” information so it fell back to the last 12 — so with a small catalogue every row printed the SAME items, and then “All Products” printed them a third time. Each of the three rows now takes only products the rows above it have NOT already shown, and “New Arrivals” genuinely means the most recently listed products (newest first). If that leaves a row with nothing to show, the whole section hides itself instead of leaving a lonely heading over an empty strip — so the “🔥 Deals of the Day” heading no longer sits above a blank space either. “All Products” still lists everything, which is correct — that is the full catalogue. As you add more listings the rows will naturally fill with different products.

## v9.6

📖 Two reading fixes. (1) BULLET HEADINGS ARE NOW BOLD AND DARK. Each of the 5 points starts with a short capitalised heading and a colon (“VERSATILE POOJA LAMP:”), but it was printed in exactly the same weight and grey as the sentence after it, so the five points read as one grey wall. The heading is now bold and near-black, making the list scannable at a glance — on the product page and in the quick-view. Only a genuine short ALL-CAPS lead is treated this way, so a colon in the middle of a sentence is left alone. (2) FIX: the auto-sliding photos dragged the page back to the top while you were reading. Every time the photo changed, the app scrolled the newly-highlighted thumbnail into view — harmless when you clicked an arrow yourself, but once the photos started advancing on their own (v9.3) it fired EVERY SECOND, so reading the description, the details table or the reviews became impossible: the page jumped back up to the gallery again and again. The thumbnail strip wraps onto a second row rather than scrolling sideways, so “scroll it into view” actually scrolled the WHOLE product page. It no longer touches the page scroll at all — the active thumbnail is simply highlighted, and only if the strip itself is genuinely side-scrollable does it nudge that strip alone. The photos still change every second, the counter and highlight still follow, and arrows / ←→ keys / swipe are unchanged.

## v9.5

💎 “Luxurious & Premium” is now the DEFAULT writing tone, and ⏳ the ✨ AI button COUNTS DOWN. (1) Every new listing starts on Luxurious & Premium instead of “Professional & Engaging”, so you no longer have to change the dropdown each time — and pressing Reset brings it back to Luxurious & Premium rather than leaving whatever was last picked. You can still switch tone per listing whenever you want. (2) The button now tells you how much longer to wait — “⏳ Writing your listing… about 26s left” — instead of only counting the seconds that have passed. The estimate is not a guess pulled from thin air: it learns from YOUR own generations, moving halfway towards however long each successful run actually took (45s to start with). If a run goes past the estimate it never shows a negative number — it says “Almost done…” with the time so far.

## v9.4

🔍 CLICK ANY PHOTO TO SEE IT BIG, and ✨ THE AI BUTTON NO LONGER LOOKS DEAD. (1) Thumbnails are 72–82px — big enough to spot a photo, useless for checking one. Now clicking ANY photo opens it full-screen: the ④ Product Images tiles, every photo in a combination row’s PHOTO column, the ✨ AI panel’s own photos, and the buyer’s product page (whose main image showed a magnifier cursor but did nothing when clicked). ‹ › or the ←/→ keys step through that same set of photos, a “3 / 9” counter shows where you are, and Esc, the ×, or clicking the dark background closes it. Dragging a photo to reorder it still works exactly as before. (2) The ✨ Generate & Fill button appeared to freeze. It was not broken — the AI genuinely takes 30–60 seconds to answer (measured 37.5s), and the button just sat on “⏳ Analysing…” saying nothing, so it looked dead. It now counts the seconds out loud (“⏳ Analysing… 24s” and “✍️ Writing… usually 30–60s”) so you can see it is working. More importantly it can no longer get PERMANENTLY stuck: nothing in the chain had a time limit, so one photo whose server never replied, or one hung request, left the button disabled for ever with no way back except reloading the page. Reading photos is now capped at 8 seconds each (30s overall) and the AI call at 3 minutes, and if either runs out the button comes back with a plain-English message telling you what to do.

## v9.3

™️ BRAND NAME NOW PRINTS EXACTLY AS REGISTERED, and 🎞️ EVERY LISTING AUTO-SLIDES ITS PHOTOS. (1) The brand line above the product title was styled ALL-CAPS, which turned the trademark “iINTELLIGENCEi” into “IINTELLIGENCEI” — the two lower-case i’s that make the mark are what got destroyed. The forced upper-casing is gone, so a brand now shows exactly as the seller registered it (the name was always stored correctly — only the display was wrong). (2) Product photos now change by themselves, ONE IMAGE EVERY SECOND — on the product page AND on every listing card across the site (Deals, Featured, New, the main grid and a seller’s store), so a shopper sees all 8 or 9 photos of a product without clicking anything. It is built to stay light: one shared timer for the whole page instead of one per card, only cards actually on screen advance, everything stops while the browser tab is in the background, and hovering a card (or the product-page gallery) holds the picture still so it never slides away from under your pointer. The ‹ › arrows, the “3 / 9” counter, the thumbnails, the ←/→ keys and swipe all still work.

## v9.2

🖼️ FIX: the thumbnail strip under the product photo was cut in half and scrolling did NOT fix it. The photo column is “pinned” so the pictures stay beside the details as you read — but a pinned column that is TALLER than your window stops moving the moment it pins, so its bottom (the row of small photos, and the ❤️ Wishlist / 🔗 Share / 📋 Copy buttons) stayed stuck below the edge of the screen no matter how far you scrolled. It only appeared if you scrolled to the very end of the page. On a laptop with the bookmarks bar and taskbar showing, that is most windows. Now the column stays pinned ONLY while it fully fits on screen; when it does not, it simply scrolls with the page like normal content, so every thumbnail is reachable. Re-checked automatically when you resize the window or pick a variation with its own photos.

## v9.1

🔍 KEYWORDS ARE NOW FULLY VISIBLE. Both keyword boxes — “Extra keywords (optional)” in the ✨ AI panel and ⑦ Backend Search Keywords — were one-line boxes: a long list like “Therali Leaves, Fresh Therali Leaves, Therali Ila, Therali Ela, Therali Leaf, Buy Therali Leaves Online, Kerala Therali…” ran off the right edge and you had to drag sideways to read your own keywords. They now WRAP onto as many lines as needed and the box grows itself as you type, so the whole list is on screen at a glance — when editing a listing, restoring a draft or after ✨ Generate & Fill too. Nothing else changed: the value is still one line (Enter is ignored, a pasted multi-line list becomes spaces), the 200-byte counter, saving and submitting behave exactly as before.

## v9.0

🗑️ “Delete all listings” in My Products. Clears your whole catalogue in one go so you can list afresh, instead of deleting 55 products one by one. You must type DELETE ALL to confirm, and the screen states plainly what goes and what stays: only the LISTINGS are removed — your account, PIN, profile, saved draft, Catalogue Tracker list and every form setting and placeholder remain exactly as they are. Progress is shown listing by listing. Every deleted row is also copied to the “Product Backups” tab in the sheet first, so a catalogue can be brought back.

## v8.9.2

🛡️ A listing can no longer be replaced by accident. Choosing “replace” now opens a second screen that shows BOTH listings side by side — the one being replaced in red, the one you are adding in green — and the red button only works after you tick “yes, these are the same product”. And every edit or overwrite now saves the previous version of the row to a new “Product Backups” tab in the sheet first, so even a mistaken replacement can be copied back.

## v8.9.1

⚠️ IMPORTANT FIX after a listing was lost: the “already listed” dialog showed the title you were SUBMITTING, not the listing it would replace — so “Overwrite” silently destroyed a different product (an Aluminium Food Strainer replaced the Aluminium Bucket). The dialog now names the EXISTING listing in a box, spells out that replacing it loses that listing’s title, photos, price and content, and adds a third choice: “➕ Add as a new product”. A wrong match can no longer force you to overwrite anything — that choice also tells the server to accept it, so nothing gets stuck.

## v8.9

📦 FIX: “Fill stock & pack size” put the WRONG figures on 1 Qty / 2 Qty rows. It matched loosely, so a 2 Qty row could take the 1-pack’s box, “Dog Chain 1 Qty” could pick up an “Invisible Chain” order, and a 7.5 L / 11.5 L bucket listing got the same box on every row. Now the pack quantity AND the capacity (7.5 L vs 11.5 L) must match exactly, a product is never matched to its own carton row, names are compared on the words that actually identify the product (the AI’s marketing words are ignored and rare words count more), EVERY variation option — not just Quantity — goes into the search, and the latest order only wins among equally good matches instead of beating a better one just for being recent. If there is no order or stock row for that exact pack, the cell is now LEFT BLANK and the message says so — no more borrowed figures. Product size, product weight, package size and package weight all come from the latest matching order; stock comes from the Stock Availability app (packed + loose, damaged excluded). iINTELLIGENCEi only.

## v8.8.2

⚠️ FIX: “Already Listed Earlier” wrongly claimed a brand-new product was a repeat of a completely different one — listing an Aluminium Dust Pan asked whether to overwrite the Aluminium Bucket. The check compared whole titles, and the ✨ AI writes the same marketing words into every title (“Rust Free … Metal … Strong Handle for Home Bathroom Kitchen Garden Cleaning Storage”), so two unrelated products looked like the same one. It now compares only the words that actually name the product, and gives more weight to the rare ones — “aluminium” is in a dozen of your listings and proves nothing, “dustpan” or “uruli” identifies the item — plus dimensions (read in any order) and weight. Re-listing the SAME product with a fresh AI title is still caught, and 1 Qty vs 2 Qty are still separate products. Checked against all your live listings: only the two that really are listed twice now raise the prompt.

## v8.8.1

📐 The combinations grid now asks for the PRODUCT size first and the PACKAGE size after it — the same order buyers see in 🔧 Product Details (Product Size, Product Weight, Package Dimensions, Package Weight). Both sets of boxes are ALWAYS on screen for every combination too — the earlier “Add product size per variation” show/hide link is gone, so nothing has to be opened before you can type. Scroll the grid sideways if your screen is narrow.

## v8.8

📏 Buyers now see the SIZE & WEIGHT of the variation they picked. The 🔧 Product Details table always shows four rows, product first: Product Size, Product Weight, Package Dimensions, Package Weight. Choose 2 Qty (or XL) and all four switch to that combination’s own figures, exactly like the price, photos and stock already do. A variation without its own values falls back to the listing’s 📐 Product Dimensions and ⑧ Package Dimensions, and anything the listing has never carried shows “—” instead of a blank or a wrong figure. Works for combination listings and older per-option listings alike. ⚠ For the listing-level sizes to appear on plain (non-variation) products, the Apps Script backend must be re-deployed — it now sends productDimensions/packageDimensions with the storefront and seller feeds. v8.7 —📐 PRODUCT SIZE PER VARIATION. Until now each variation could carry its own packed BOX (Pack L×W×H + Pack Wt), but the item itself was one size for the whole listing — wrong for an XL tee vs an M, or a 2-pack vs a 1-pack. Click “📐 Add product size per variation” above the combinations grid and every row gets its own Product L×W×H and Product Wt (in Apparel mode it is a Size box instead of L×W×H). Leave a row blank and it uses the product’s 📐 Product Dimensions & Weight, exactly like the pack columns. The columns stay hidden until you ask for them (the grid keeps its width), and open by themselves when a listing already has these values — so editing an old listing never loses them. “📦 Fill stock & pack size” now fills the item size per row from the latest order too, “Fill every row at once” has Prod L/W/H/Size/Wt boxes, and legacy per-option listings get the same fields inside “📦 Package & product size (optional)”. v8.6 —📋 Catalogue Tracker now counts pack sizes listed as VARIATIONS. A size like “Achu Murukku Mould … 112 gm each, 2 Qty” that lives as a 2 Qty row inside the 1 Qty listing was still shown as Pending, because the tracker only compared your catalogue against listing TITLES. It now also matches every variation row of every listing, and the Completed list says which variation matched — so your “pending” count reflects what you have really listed.

## v8.5.1

FIX: a product could be listed TWICE. The duplicate check only recognised an EXACT title match, but the ✨ AI rewrites the title every time it runs — so re-listing the same product with fresh AI content looked like a brand-new product and created a second listing. It now recognises the same product even when the title has been re-worded (comparing dimensions, pack quantity, weight and the words in the name), and shows the usual “already listed — Cancel or Overwrite” choice. Different pack sizes (1 Qty vs 2 Qty) are still treated as separate products. Tip: use Overwrite to update the existing listing instead of creating a new one.

## v8.4

Package dimensions now auto-fill from the IBI Order Processing app. The “📦 Fill stock & pack size” button reads the LATEST order for the product and fills the packed box it actually shipped in (Pkg L×W×H + Pkg Wt) — per combination row for a variation product (each pack size gets its own box from its own latest order), or ⑧ Package Dimensions for a single product. It also fills 📐 Product Dimensions & Weight from the same order when blank, so the ✨ AI has what it needs. Only blank boxes are filled — anything you typed is left alone — and the toast names the order date it used. iINTELLIGENCEi only.

## v8.3.2

FIX: the right-hand side of the Add-Product form was being cut off (Enable Variations tick-box, Remove Type, the character counters). The combinations grid had grown wide enough (Variation Title + Pack L×W×H + Pack Wt columns) to push the whole form past the edge of the screen; it now stays inside the form and scrolls sideways within its own box, as intended. Nothing is hidden any more.

## v8.3.1

The ✨ Generate & Fill button is no longer cut off on the right: it now takes its own full-width line whenever the window (or your zoom level) makes the panel narrower than ~1650px, instead of overflowing its card.

## v8.3

⑦ HSN Code now fills itself from IBI’s official HSN/GST master (all 267 products, from IBI_Complete_Product_Master_HSN_GST.xlsx). Just pick or type the product name and the correct HSN appears — no button needed — and the toast shows the GST rate (0 / 3 / 5 / 18%) so you can sanity-check it. It never overwrites an HSN you typed. Leading zeros are preserved exactly (06022010, 08011990…). The Stock Availability app is now only a fallback for HSN, and still the source for Stock counts.

## v8.2

(1) ⑦ HSN Code is now filled from the Stock Availability app together with Stock — but only when that product’s row actually has an HSN, and never when the matched row is a carton/packing box (a carton’s HSN on a product would be a GST error). It never overwrites an HSN you typed yourself. NOTE: only a handful of rows in the Stock app currently have HSN filled in, so add them there to get the most from this. (2) The ✨ Generate & Fill button can no longer be cut off on a narrow or zoomed window — it drops onto its own line instead.

## v8.1

Stock auto-fill from the IBI Stock Availability app. A “📦 Fill stock from Stock app” button now reads the live inventory sheet and fills the Stock figure for you — for a variation product it fills EVERY row, matching each pack size to its own stock row (1 Qty, 2 Qty…). Stock used is packed + loose; damaged units are excluded. It reports which stock-sheet product it matched so you can check it, and matching is fuzzy so it still works when the stock sheet’s product name differs slightly from the listing. Available for the iINTELLIGENCEi account only, since this is IBI’s own internal inventory.

## v8.0

Each variation can have its OWN TITLE. The combinations grid has a new “Variation Title (optional)” column, so a 2-pack can read “… Pack of 2” instead of the 1-pack title. Leave a row blank and it keeps the normal behaviour (product title with the option appended, e.g. “… (Quantity: 2)”). On the product page, choosing a variation now shows that variation’s own title. Saved per variation and restored when you edit the listing.

## v7.9

Package size is now asked in ONE place too. With Variations on, the ⑧ Package Dimensions block is hidden — you set <b>Pack L×W×H</b> and <b>Pack Wt</b> per variation in the grid (a 2-pack really does ship in a bigger box), and “⚡ Fill every row at once” now includes pack size and weight so identical rows are one action. The shipping figure saved for the listing is taken from the first variation row automatically. Turn Variations off and the normal ⑧ block returns.

## v7.8.1

Fixed the Pack L×W×H boxes being too narrow: a decimal value like 12.50 was half cut off. The boxes are wider (66px, centred, spinner arrows removed) and Pack Wt is wider too, so the full number is always visible.

## v7.8

Amazon-style order quantity limits. Add Product now has “Min order qty” and “Max order qty” (both optional — blank means minimum 1 and no maximum), and the product page enforces them: the Qty box opens at your minimum, will not go below it or above your maximum, never lets a buyer order more than the stock on hand, and shows a small “Minimum 2 · Max 10 per order” note beside Qty. Saved in two new sheet columns (24–25) — the Apps Script backend must be re-pasted and redeployed for the limits to be stored.

## v7.7

Package size per variation. The combinations grid now has “Pack L×W×H (cm)” and “Pack Wt (g)” columns, so a 2-pack that ships in a bigger, heavier box can carry its own packed dimensions and weight instead of everything sharing one figure. Leave a row blank and it falls back to the product’s ⑧ Package Dimensions (shown as the faint placeholder). Saved per combination and restored when you edit the listing.

## v7.6

Photos are now asked in ONE place too. When Variations are on, the big ④ Product Images drop-zone is hidden — you upload each variation’s photos in the PHOTO column of the grid, and they automatically become the product’s gallery (first photo of the first variation = main image). Previously the form showed TWO image-upload areas for the same product. Turn Variations off and the normal ④ Product Images uploader returns.

## v7.5.1

The combinations grid now shows price in ONE place only. The “Apply to all: Price / MRP / Stock” boxes that sat right above the grid’s own Price / MRP / Stock columns are collapsed behind a small “⚡ Fill every row at once (optional)” link — tap it only when you have many combinations and want to fill them all in one go.

## v7.5

(1) NOTHING IS LOST ON REFRESH. Your part-finished product is now restored automatically when you come back — including the photos, every field, the ✨ AI panel entries AND the whole ③b Variations section (types, options and the combinations grid with its prices and photos, which used to disappear completely). It restores silently when the form is empty, so it never overwrites work in progress. (2) The single ③ Selling Price / MRP / Stock now disappears the MOMENT you tick Enable Variations — price is asked only in the variation rows, never in two places.

## v7.4

Bigger variation photos you can REORDER BY DRAGGING. Each photo in the combinations grid is now a large 82px tile (was 58px) showing the whole picture, and you can simply DRAG any photo and drop it anywhere in that row to change the order — the photo moves to that position (it does not just swap). The first photo is marked “MAIN” because that is the one buyers see first, so dragging a photo to the front makes it the main image. Bigger × to remove a photo too.

## v7.3

No more uploading the same photos twice. If you have already attached photos to your variation rows (the PHOTO column in the combinations grid), ④ Product Images can be left EMPTY — those photos are used as the product’s gallery automatically when you submit. Also: variation thumbnails are now 58px and show the whole picture in a wider column, so they are easy to see.

## v7.2.3

Combination photos are much easier to see: each thumbnail in the PHOTO column is now 58px (was 36px), shows the WHOLE picture instead of a cropped square, and the column is wider so the photos spread out instead of being squeezed into a narrow strip. The × to remove a photo is bigger too.

## v7.2.2

FIX: the combinations grid (where you enter each variation’s Price / MRP / Stock) was not appearing in v7.2, so there was nowhere to type a price. Hiding the old “Combine axes” tick-box accidentally hid the grid with it — the grid is back, directly under ③b Product Variations.

## v7.2.1

Removed the duplicate “💾 Save Draft” button from the Add-Product header bar (next to Reset / Submit). Only the single floating Save Draft button remains, and the form still auto-saves as you type.

## v7.2

ONE simple way to sell variations, and the price is asked ONCE. Just tick Enable Variations and name your types (e.g. “Quantity” with 1, 2 — or “Quantity” + “Size”): the combinations grid now builds ITSELF automatically, with one row per real variant carrying its own Price / MRP / Stock / photo. The 🧩 “Combine axes” tick-box is gone (it happens on its own), the empty Price/MRP/Stock boxes no longer clutter the option rows, and the single ③ Selling Price / MRP / Stock at the top hides itself whenever the grid is in use — so price is never entered twice. Also fixed the DOUBLE SCROLLBAR: the page behind Seller Central kept its own scrollbar next to the dashboard’s. Existing per-option-priced listings keep working exactly as before when you edit them.

## v7.1

SIMPLER Add-Product form — fewer, clearer choices. (1) No more asking for the price twice: if you set a Price / MRP / Stock on each variation option (e.g. 1 Qty ₹299, 2 Qty ₹499), the top ③ Selling Price / MRP / Stock box now HIDES itself and is filled in for you — the lowest option price becomes the “from ₹” price on the storefront card. Clear the option prices and the single top price comes back. This already worked for 🧩 Combination products; now it works for per-option pricing too. (2) The 🔗 Variation Family (Parent / Child listings) box — an advanced path almost nobody needs — is now COLLAPSED behind “⚙️ Advanced: separate Parent / Child listings”, so the form presents ONE obvious way to sell a product in several versions: ③b Product Variations. Nothing was removed; open the Advanced box if you ever need it.

## v7.0.1

The Seller Central counters (Total Products / Live on Site / Pending Review) now update THE MOMENT you delete a product — previously the deleted item briefly stayed in the counts because the dashboard re-showed its saved copy of the list before the server replied. Pausing or resuming a listing also updates the Live/Pending counts instantly.

## v7.0

Product images now work like a proper carousel. Big ‹ › arrows on the main photo flip through every image, a “3 / 9” counter shows exactly how many photos the product has (so none feel “missing”), the matching thumbnail highlights and scrolls itself into view, and it loops around from the last photo to the first. On a phone you can simply SWIPE left/right on the photo; on a computer the ← and → arrow keys work too. The thumbnail strip now scrolls inside its own box instead of being cut off, so all 9 photos are always reachable. Each combination’s own photo set becomes its own carousel.

## v6.9.9

Seller preview now returns to Seller Central: when you open 👁️ Preview/View from My Products, the top-left button reads “← Back to Seller Central” and clicking it takes you straight back to My Products (previously the only way out dropped you on the storefront and you had to re-open the dashboard by hand). Normal shopper navigation is unchanged.

## v6.9.8

Bigger product images, industry standard: the product-page photo gallery now takes up to 580px (~45% of the page, like Amazon/Flipkart) instead of the old 380px cap, and thumbnails grew from 60px to 74px — the product photo is now the hero of the page. Mobile layout unchanged (already full-width).

## v6.9.7

Policy update across the storefront: returns are now “7 to 10 days easy return & exchange” everywhere (announcement bar, product page, details table, FAQ, storefront cards — replacing the old mixed 14-day/30-day texts), and Cash on Delivery is REMOVED everywhere: the marketplace is 100% Prepaid (announcement bar and product details say so, the COD footer icon is gone, and shipping-label mock tags now read PPD). The checkout was already prepaid-only. The product-page trust line now reads “Secure Payment via Google Pay · 100% authentic” (was “payment via WhatsApp”).

## v6.9.6

Combination products: the product-page TITLE now shows which option is selected — e.g. “…Aroma Leaf (Quantity: 2)” in purple next to the title — so the 1 Qty and 2 Qty views are never identical/confusing. Display-only: the cart, orders and stock still use the listing’s own title.

## v6.9.5

Fixed the “Submit Product for IBI Review” button turning nearly invisible (white text on light grey): after a form reset the button lost its dark background. It now always keeps its dark gradient, dims slightly while disabled/submitting, and brightens on hover.

## v6.9.4

No more accidental photo duplicates on combination/variation rows: adding the same photo file to the same row again is now skipped with a notice (before the photos were visible, re-uploads silently piled up into “+11” duplicates — delete any old extras with the × on each thumbnail). The same hosted photo URL can also never be stored twice on one row.

## v6.9.3

(1) Combination & variation photos are now ALL VISIBLE: every photo you attach to a combination row (or a variation option) shows as its own thumbnail in the Photo column, each with its own × to remove just that one — no more a single tiny thumb hiding the rest behind a “+11”. (2) Smart MRP: type a Selling Price anywhere (top ③, a combination row, or a variation row) and the MRP fills itself as Price × 1.5, rounded to a whole rupee — no decimal points in MRP, ever (typed decimals are rounded off when you leave the box). Manual control kept: type your own MRP and the auto-fill never overwrites it; clear the MRP box to turn auto-fill back on for that row.

## v6.9.2

The ✨ AI panel’s “＋ Add photo for AI” photos are now VISIBLE: each added photo shows as a numbered thumbnail right under the button, with its own × to remove just that one (plus the existing “clear” for all). No more guessing what “3 photos added” actually contains.

## v6.9.1

The ✨ AI “Product name” box is now personal: its type-to-filter suggestions come from YOUR uploaded 📋 Catalogue list (any seller who uploads their Excel sees their own names there); with no upload it offers the IBI master catalogue as before, and you can always just type any name manually — a small hint under the box tells you which list is active.

## v6.9

📋 Catalogue Tracker: a new tab in Seller Central for EVERY seller. Upload your master product-name list as an Excel/CSV file (one name per row) and the dashboard instantly shows which of those products are ✅ COMPLETED (already listed, with the live listing it matched) and which are 🕐 PENDING, with a progress % and a search filter. Matching is smart — it recognises the same product even though listed titles are longer SEO titles (it compares dimensions, pack quantity, weight and name words). Each pending product has a “➕ List now” button that opens Add Product with the name pre-filled for the ✨ AI generator, and “📋 Copy pending list” copies what’s left. Your list is saved on your device per seller account and survives sign-outs; re-upload the file anytime to update it.

## v6.8

✨ AI listing upgrades. (1) The “Product name for the AI” box now offers IBI’s full master catalogue (267 product names with size/weight/qty) as type-to-filter suggestions — same list as the standalone Listing Generator — so listing the catalogue is a pick, not a re-type. (2) The shared AI backend was overhauled today: current Gemini models (2.5-flash), Claude upgraded to Opus 4.8, DeepSeek fixed for its V4 engine (auto-disables its “thinking” mode), and a smarter parser that survives AI formatting quirks — so ✨ Generate & Fill is reliable again on every provider.

## v6.7

Cleaner pricing: no more price in two places. For a COMBINATION product (③b Product Variations → 🧩 Combine), the top ③ Selling Price / MRP / Stock fields are now hidden — you set ONE price, MRP and stock per combination in the grid, and nowhere else. The headline “from ₹…” price shown on the storefront browse card is filled in automatically from the lowest combination price (MRP = the highest, stock = the total). A SINGLE-pack product is unchanged: you set its one price at the top ③ as before. This removes the confusing duplicate price entry for variation products. Front-end only.

## v6.6

Seller Central stays put on refresh + a professional new sign-in page. (1) Refreshing the browser inside Seller Central no longer kicks you back to the storefront — you stay on the exact tab you were on (My Products / Add Product / Orders / Earnings / Profile). The dashboard remembers it is open and which tab is active (sessionStorage `ibi_seller_view`) and restores it on page load; minimising or signing out returns you to the storefront as before. (2) Redesigned the Seller Login page to an industry-standard two-panel layout: a branded benefits panel (reach, AI listing, GST invoices, fast payouts) beside a clean sign-in form with focus states, a show/hide PIN toggle, a collapsible “Forgot your PIN?” helper, a clearer Register call-to-action and a security note. The top-bar “Logged in as” badge now shows only after you sign in.

## v6.5.1

Auto-approval is now limited to the iINTELLIGENCEi seller account only; every other seller still goes through normal IBI review.

## v6.5

Edits go live instantly + temporary auto-approval. (1) Editing an ALREADY-APPROVED listing now updates the storefront IMMEDIATELY — the new price, stock, images or text apply without re-approval and the product no longer disappears into a “pending” queue (previously any edit reset the listing to Pending, so changes like a new price never showed until an admin re-approved). A product the seller has Paused stays paused; only never-approved listings still wait for first review. The seller’s success screen now says “Changes Are Live!” when the edit is live. (2) TEMPORARY: new listings from the iINTELLIGENCEi account are auto-approved and go live instantly (no manual approval step) while its full ~267-product catalogue is being loaded — the success screen shows “Product Is Live!”. Both behaviours are backend changes in IBI_Seller_Backend.gs (editProduct keeps the live status; addProduct auto-approves only sellers matched by AUTO_APPROVE_SELLER_IDS/EMAILS/NAME_MATCH) — the Apps Script must be re-pasted & redeployed for them to take effect. Set AUTO_APPROVE_ENABLED=false to restore normal review for everyone.

## v6.4

Clearer image uploads: when adding a product’s photos, every uploaded image is now shown in a large, responsive tile grid (≈150–190px squares that adapt to your screen) instead of tiny 110px thumbnails — so all your images are visible at once, not just the first. Each photo is shown in FULL (no more cropping — the whole image is fitted on a clean white background exactly as buyers will see it), with a bigger “⭐ MAIN IMAGE” badge on the cover photo, a clear “2 / 5” position counter, and larger ◄ ► reorder / ⭐ set-main / DEL buttons that are easier to tap on a phone. Front-end only — no backend change.

## v6.3.4

Clearer variations guidance: the 🔗 Variation Family box now shows a “Which one do I use?” hint — for one product in different colours/sizes (e.g. a T-shirt), leave it on “Standalone product” and use ③b Product Variations → 🧩 Combine; use a Family only when each variation should be its own separate listing. The 💬 Listing Assistant gained a matching “Variation Family — what is it?” topic explaining the two approaches.

## v6.3.3

Nudged the floating “Save Draft” button down a little so it no longer sits over the ✨ Generate & Fill button (it now floats in the lower-right area, clear of both Generate & Fill above and 💬 Listing help below).

## v6.3.2

Fixed the floating “Save Draft” button overlapping the new “💬 Listing help” button — Save Draft now sits at the right-middle of the screen, clear of the chatbot at the bottom-right.

## v6.3.1

The 💬 Listing Assistant now has a Minimise (–) button next to Close (×). Minimise tucks the chat back to the button but keeps your conversation so you can pick up where you left off; Close clears it and starts fresh next time.

## v6.3

(1) 💬 Listing Assistant: a new built-in help chatbot for sellers. A “💬 Listing help” button appears in Seller Central; tap it for a friendly, step-by-step guide to listing — how to add a product, product images, price/MRP/stock, variations, combinations (Colour × Size × Material), t-shirt/apparel sizes, the ✨ AI generator, HSN & keywords, submitting, and troubleshooting. Tap a topic or type a question; it always works (no internet AI needed). (2) The ✨ AI listing generator is now VARIATION-AWARE: it reads the colours/sizes/materials you added and writes a title that fits ALL of them (instead of locking to one), mentions the options in the description, and seeds them into the keywords. For t-shirts in Apparel mode, if the Size box is blank it now auto-uses your “Size” variation (M, L, XL…) so ✨ Generate no longer stalls.

## v6.2

Apparel-friendly Product Dimensions. The 📐 Product Dimensions & Weight box now has two modes: “📦 Boxed item (L × W × H)” for rigid products (unchanged), and “👕 Apparel / soft (Size + Weight)” for clothing and other soft goods where a Length × Width × Height makes no sense. In apparel mode you enter the Size(s) you sell (e.g. “M, L, XL” or “Free Size”) plus the Weight in grams — no L×W×H needed. The ✨ AI listing generator, the required-field checks, saving and editing all understand both modes (apparel products are stored as “Size: M, L, XL, 220 g”). Boxed products are completely unchanged.

## v6.1

Combination variations, easier to build. (1) The combinations grid now REBUILDS AUTOMATICALLY as you add or type new options — e.g. typing a new colour like “Navy Blue” or adding a size now makes its combinations appear on their own; before, you had to click “Build / refresh combinations” by hand (a step that was easy to miss, so newly typed values seemed to “not come”). (2) Many more one-click quick-fill chips: Colour now includes Navy Blue, Sky/Royal Blue, Maroon, Olive, Teal, Beige, Off White and more; Material/Fabric includes Cotton, Polyester, Linen, Denim, Wool…; new “Fit” (Slim/Regular/Loose/Oversized) and apparel Style options; sizes now include 28–42 and XXXL. (3) Clearer guidance that you can TYPE ANY value — the chips are only shortcuts — and how to add a custom TYPE via “✏️ Custom / Other…”. Front-end only, no backend change.

## v6.0

Combination variations (Color × Size × Material…). In Add/Edit Product → ③b Product Variations, add your axes as before (e.g. a “Color” type with White/Black/Navy, a “Size” type with M/L/XL, a “Material” type with Cotton/Polyester), then tick 🧩 “Combine axes into individual variants”. The app builds every combination (3×3×2 = 18) into a grid where EACH combination gets its OWN Price, MRP, Stock and photo(s) — so one listing can carry every real SKU. On the product page the buyer picks one option per axis (Color, then Size, then Material); the price, stock status and photos update to the exact chosen combination, unavailable combinations grey out, and Add-to-Cart is blocked until a valid combination is selected. The chosen combination (e.g. “White / M / Cotton”) and its own price now flow all the way into the Cart, checkout summary and the order saved to your sheet, so billing is correct per SKU. Any number of axes is supported. Existing standalone products, single-list variations and parent/child variation families are unchanged. Front-end only — no backend change.

## v5.9

Product photos are now saved to Google Drive named after the PRODUCT (e.g. “Coir Brush Floor Cleaning - 1.jpg”, “… - 2.jpg”) instead of an opaque “ibi_product_1784…​.jpg” timestamp — so your Drive “IBI Product Images” folder is easy to browse. The name is taken from the ① Product Title at the moment each photo uploads (Title sits above Images in the form, so it is normally already filled); if the title is still blank when a photo uploads, that file keeps the old timestamp name as a safe fallback. Front-end only — no backend change.

## v5.8

After you submit a Parent or Child in a variation family, the success screen now shows a “🎨 Add another variation to <family>” button — it opens a fresh Add-Product form already in Child mode with the family name & type pre-filled, so building out 1/2/4/6 Qty (or sizes/colours) is a quick loop.

## v5.7

Amazon-style variation families (parent + child listings). Selling the same item in different sizes / quantities / colours / styles / combos? In Add Product pick 🔗 Variation Family → create ONE ⭐ Parent (the cover) then a 🎨 Child listing for each variation. Every child keeps its OWN title, OWN images and OWN price/stock — link them by giving them the SAME family name. Buyers see ONE card on the storefront (“from ₹…”, “N options”); opening it shows a variation picker with every child (photo + label + price), and tapping one shows that child’s full details on the same page. A Parent is a non-buyable cover, so it skips price/MRP/stock/HSN/dimensions. Existing single-listing variations and standalone products are unchanged.

## v5.6

Removed all built-in demo/seed products. The storefront and “My Products” now show ONLY real listings from the seller backend (Google Sheet) — no more placeholder catalogue.

## v5.5

Easier AI listing: the 📐 Product Dimensions & Weight box now sits at the TOP of the Add/Edit Product form (right under the ✨ AI panel), so the size & weight the AI needs are filled before you click Generate — no more scrolling down to find them. And if anything the AI needs is missing (product name, dimensions, weight or a photo), the reason now shows in red RIGHT UNDER the ✨ Generate & Fill button (not just as a quick toast you can miss). Package Dimensions is now step ⑧.

## v5.4

✨ AI Listing Generator now works even when EDITING an existing product or after a page reload. Root cause: your product photos are stored on Google Drive and shown via Drive's drive.google.com/thumbnail address, which blocks the browser from reading the image back for the AI — so on an edit (or reload) the generator saw "no readable photo" and produced nothing. The app now reads that same Drive photo through Google's lh3.googleusercontent.com mirror (which DOES allow it), and uses a direct download-then-read path that also covers Wix, Amazon and ImgBB images. Net result: ✨ Generate & Fill now finds your photo whether you just uploaded it, reloaded the page, or opened an old listing to edit — no need to re-add the photo.

## v5.3

Fixed the ✨ AI Listing Generator not filling the form while creating a new listing. Your uploaded photo is quietly moved to permanent hosting a few seconds after upload; the AI then couldn't re-read that hosted photo (cross-origin blocked), so it reported "Add at least one product photo" and generated nothing. The app now keeps a copy of your photo's image data the moment it uploads, so ✨ Generate & Fill always has a readable image — no more empty results, whether you click straight away or after the upload finishes. Clearer message too if an older product's hosted photo can't be read (just re-add the photo).

## v5.2

My Products: click any product card (or the new 👁️ View button, now on demo/seed products too) to open its full listing exactly as customers see it. Fixed the "Coconut Coir Brush 2 Qty" card — its main image was a dead Wix asset; repointed to a working photo, and the My Products thumbnail now retries enc_avif→enc_auto like the rest of the app. Demo/seed products are now hidden from My Products once you have really listed the same item (close-title match), not just on exact-title match.

## v5.1

Per-variation package size: each variation option (e.g. 1 Qty vs 2 Qty) can now carry its OWN optional package dimensions (L·W·H + weight) via a 📦 collapsible row — blank options fall back to the product's ⑨ Package Dimensions. Optional, per option. v5 — ✨ AI Listing Generator built into Add/Edit Product: one click writes the SEO Title (long), 5 bullet points, Description & backend keywords straight into the form (from the product name, dimensions & photo) — and records the same content to IBI's Google Docs automatically, exactly like the standalone Listing Generator. Asks before overwriting content you already typed.

## v4.19

Social sharing previews: proper Open Graph + Twitter Card tags and a branded 1200×630 link-preview banner (rich previews on WhatsApp, Facebook, X).

## v4.18

Per-variation image galleries: each variation option (e.g. each pack size / colour) can now carry its OWN photo(s). When a buyer picks an option, the product gallery (main image + thumbnails) rebuilds to show ONLY that option's photos; options without photos fall back to the product's full gallery. Sellers can attach MULTIPLE images per option (📷 appends, +N badge, × clears).

## v4.17

Fixed mobile search (full-width row).

## v4.16

Variations shown directly under price.

## v4.15

Mobile fully edge-to-edge.

## v4.14

Data Backup & Restore.

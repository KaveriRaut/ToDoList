const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ =require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//////mongodb database connection
mongoose.connect("mongodb://localhost:27017/todolistdb");
////schema for input record in DB
const itemsSchema = {
  name: String
}
////new collection is created with itemSchema=> as Item
const Item = mongoose.model("Item", itemsSchema);
////default items
const item1 = new Item(
  {
    name: "Welcome to your todolist!"
  }
);
const item2 = new Item(
  {
    name: "Hit the + button to add new item!"
  }
);
const item3 = new Item(
  {
    name: "<-- Hit this button to delete an item!"
  }
);
//array of default items
const defaultItemsArray = [item1, item2, item3];
///another schema of ListTasks in other page of todolist
const listSchema = {
  name: String,
  items: [itemsSchema]  //relation of listSchema with itemsSchema established
}
///////new collection is created with listSchema=> as List
const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {

  //mongoose find() function=>to display everything from Item Collection of DB
  Item.find({}, function (err, foundItemsArray) {

    /////if(there are no items already in FounditemArr)then==>add default items in Item collection and redirect to "/"route
    /////else => add the items of foundItemsArr in already existing list of items and render that same modified list
    if (foundItemsArray.length === 0) {
      Item.insertMany(defaultItemsArray, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log('Successfully saved the Default items to DB');
        }
        res.redirect("/");
      });
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItemsArray });
    }
  });
});

////to handle other pages (seperate web-pages on todolist port)=>creating seperate task list for them and all other functions same as main "Today" list function works
app.get("/:customListName", function (req, res) {
  // console.log(req.params.customListName); //give access to name of new list(as customListName) u wanna create by typing in url extension
  const customListName = _.capitalize(req.params.customListName); //using the lodash to capitalize the first letter of customlistName

  ///firstly check if that customListName already exist in our List collection 
  List.findOne({ name: customListName }, function (err, foundList) {
    //if there is NO error
    if (!err) {
      //check if customListName does not already exists in foundList=>then create new list and add defualt items=>save this list and redirect to "/"
      if (!foundList) {
        // console.log("Doesn't exist!");
        //create new list here
        const list = new List({
          name: customListName,
          items: defaultItemsArray
        });
        list.save();
        res.redirect("/" + customListName);
      }
      //else if customListName already exists in foundList=>then just render all the foundList items
      else {
        // console.log("Exists!");
        // show the existing list
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    }
  });


});

app.post("/", function (req, res) {

  const itemName = req.body.newItem; //new item we want to add in any page-list
  const listName = req.body.list;//refer list.ejs file  //we wanna to identify which page-list ka '+' button is clicked
  //creating the new item record with given itemName means content of that item
  const item = new Item(
    {
      name: itemName
    }
  );
  //if(list is our default 'Today' list)=>directly add new item in that
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  }
  //else if we r add item to other page-list=> then check if that given page-list name already exist=>push item to its foundList and save the foundList =>redirect to "/"
  else {
    List.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function (req, res) {
  // console.log(req.body.checkbox);
  const checkedItemId = req.body.checkbox;//we will be accessing the _id related to clicked checkbox to delete that item//refer list.ejs file 
  const listName = req.body.MyListName; //to know that the item we want to delete is from which list
  //if it is "Today" list
  if (listName === "Today") {
    //using findByIdAndRemove() method to search for item with checkedID and delete 
    Item.findByIdAndRemove({ _id: checkedItemId }, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted checked item");
        res.redirect("/");
      }
    });
  }//else if item to be deleted belong to any other custom lists 
  else {
    //using findOneAndUpdate({condition to find},{update condition here nested with $pull{query to update}},callback function); method
    List.findOneAndUpdate(
      {name: listName},  //condition to find particular list by listName
      {$pull: {items: {_id: checkedItemId}}}, //this pulls the item from items Arr with id equal to checkedItemId
      function(err,foundList){
        if(!err){
          res.redirect("/"+listName);
        }
      }
    );
  }


});

app.get("/work", function (req, res) {
  res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});

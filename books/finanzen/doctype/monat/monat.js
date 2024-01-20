// Copyright (c) 2023, Bernhard Hein and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Monat", {
// 	refresh(frm) {

// 	},
// });


/**
 * Aufgaben:
 * - Automatische Übernahme von Budgets & Kategorien vom Vormonat
 * - Aktualisierung Startwerte- & Kategorien auf Basis des vorherigen Monats
 * - Sperrung Monat davor & danach?
 * 
 * Erledigt:
 * - Eintragung von Monat davor/danach muss auch beim anderen Monat Update hervorrufen --> nur selektierbar, was frei ist
 * - Kalkulation Start- & Endbetrag
 * - Filter: nur unterste Kategorie & Budget anzeigbar!
 * - Aktualisierung von Werten wie Gesamtbudget & Restbudget (Ausgaben)
 * - Kalkulation Endwert
 */






var ausgabeItems = undefined, budgetItems = undefined;
var next_month_btn = undefined;

betrag = undefined;
kategorie = undefined;
datum = undefined;
budget_list = undefined;
gesamtbudgetIsUpdated = false;



function updateGesamtBudget(frm, cdt, cdn){
    gesamtbudgetIsUpdated = false;
    frappe.db.get_value('Kategorie', frm.fields_dict.kategorie.value, 'budget_high').then((res) => {
        frm.set_value('gesamt_budget', res.message.budget_high);
        gesamtbudgetIsUpdated = true;
        updateRestBudget(frm,cdt,cdn);
        console.log(dbGesBudget);
    });
    
}

function updateRestBudget(frm,cdt,cdn){
    if (kategorie !== undefined) {
        //frappe.msgprint('A row has been added to the links table 🎉 ');

        //# Todo: Budget filtern
        //# Todo: Monat filtern
        //# Todo: Feld richtig updaten

        var restbudget = 0;

        if (betrag !== undefined) {
            restbudget = frm.fields_dict.gesamt_budget.value - frm.fields_dict.betrag.value;
            frm.set_value('restbudget', restbudget);
        } else {
            restbudget = frm.fields_dict.gesamt_budget.value;
            frm.set_value('restbudget', restbudget);
        }

        if (datum !== undefined) {
            budget_list = frappe.db.get_list('Betrag',{
                fields:['name','betrag', 'datum'],
                filters:[[
                    'datum', 'between', ['2023-12-01', '2023-12-31']
                ]]
                }
            ).then((res) => {
                res.forEach((bet) => {
                    restbudget -= bet.betrag;
                    console.log(bet);
                });
                frm.set_value('restbudget', restbudget);
                //frm.fields_dict.restbudget.value = restbudget;
                
                if (restbudget < 0) {
                    frappe.msgprint('Budget überschritten!');
                }
            });
        }
        
    }
}

function calc_startbetrag(frm){
    startbetrag = 0;
    for(var k = 0; k < frm.get_field("tbl_startbetrag").grid.grid_rows.length; k++){
        var row = frm.get_field("tbl_startbetrag").grid.grid_rows[k];
        startbetrag += row.betrag;
    }
}

var used_categories = [];
function set_category_filter(frm){


    frm.fields_dict['tbl_startbetrag'].grid.get_field('kategorie').get_query = function(doc, cdt, cdn) {
        return {
            filters: {
                'is_group': 0
            }
        };
    };
    
    frm.fields_dict['tbl_endbetrag'].grid.get_field('kategorie').get_query = function(doc, cdt, cdn) {
        return {
            filters: {
                'is_group': 0
            }
        };
    };


    used_categories = [];
    let excluded_categories = [];
    frm.doc.tbl_startbetrag.forEach(s_item =>{
        used_categories.push(s_item.kategorie);

        frappe.get_doc("Kategorie Item")
    });


    frm.fields_dict['tbl_ausgabe'].grid.get_field('kategorie').get_query = function(doc, cdt, cdn) {
        return {
            filters: [
                ['Kategorie', 'name', 'in', used_categories]
            ]
        };
    };
    frm.fields_dict['tbl_einnahme'].grid.get_field('kategorie').get_query = function(doc, cdt, cdn) {
        return {
            filters: [
                ['Kategorie', 'name', 'in', used_categories]
            ]
        };
    };
    frm.fields_dict['tbl_transaktion'].grid.get_field('source').get_query = function(doc, cdt, cdn) {
        return {
            filters: [
                ['Kategorie', 'name', 'in', used_categories]
            ]
        };
    };
    frm.fields_dict['tbl_transaktion'].grid.get_field('dest').get_query = function(doc, cdt, cdn) {
        return {
            filters: [
                ['Kategorie', 'name', 'in', used_categories]
            ]
        };
    };
}

frappe.ui.form.on('Monat', {
    setup: function(frm){
    },
	refresh: function(frm) {
        calculateStartbetrag(frm);
        calculateEndbetrag(frm);
        calculateBudget(frm);
        set_category_filter(frm);

        frm.fields_dict['tbl_ausgabe'].grid.get_field('budget').get_query = function(doc, cdt, cdn) {
            return {
                filters: [
                    ['parent', '=', frm.doc.name],
                    ['parentfield', '=', 'tbl_budget']
                ]
            };
        };

        used_categories = [];
        frm.doc.tbl_startbetrag.forEach(s_item =>{
            used_categories.push(s_item.kategorie);
        });

        

		frm.add_custom_button('Aus Vorlage', function () { frm.trigger('get_items') }, __("Elemente einfügen"));

        // Check if there is any month in the system before adding the button
        frappe.call({
            method: 'books.finanzen.doctype.monat.monat.get_monat_count',
            args: {
                'doctype': 'Monat'
            },
            callback: function(r) {
                if (r.message > 0) {
                    // Add a custom button
                    next_month_btn = frm.add_custom_button('Nächsten Monat anlegen', function() {
                        createNextMonth(frm);
                    });

                    // Add a class to give it a highlight color
                    $(next_month_btn).addClass('btn-primary');
                    if (frm.doc.monat_danach !== undefined && frm.doc.monat_danach !== "") {
                        $(next_month_btn).hide();
                    }else{
                        $(next_month_btn).show();
                    }
                }
            }
        });
        

        // Set a custom query for the 'monat_davor' field
        frm.set_query('monat_davor', function() {
            return {
                filters: [
                    ['Monat', 'monat_danach', '=', '']
                ]
            };
        });

        frm.set_query('monat_danach', function() {
            return {
                query: 'books.finanzen.doctype.monat.monat.custom_query_function',
                filters: {
                    'current_monat': frm.doc.name
                }
            };
        });
	},

    monat_danach(frm){
        if (frm.doc.monat_danach !== undefined && frm.doc.monat_danach !== "") {
            $(next_month_btn).hide();
        }else{
            $(next_month_btn).show();
        }
    },

    monat(frm) {
        // Check if 'datum' is set
        if (frm.doc.monat) {
            // Convert the datum string to a Date object
            let selectedDate = frappe.datetime.str_to_obj(frm.doc.monat);

            // Set the date to the first day of the month
            selectedDate.setDate(1);

            // Check if 'monat_davor' is set and convert it to a Date object
            let monatDavor = null;

            if (frm.doc.monat_davor) {
                doc_mon_davor = frappe.get_doc("Monat",frm.doc.monat_davor);
                monatDavor = new Date(doc_mon_davor.monat);
            }
            //monatDavor = frm.doc.monat_davor ? frappe.datetime.str_to_obj(frm.doc.monat_davor) : null;

            // If 'monat_davor' is set, ensure the selected month is not before it
            if (monatDavor && selectedDate < monatDavor) {
                frappe.msgprint(__('The selected month cannot be before the previous month.'));
                frm.set_value('monat', null); // Clear the datum field
                return;
            }

            // Update the 'datum' field with the first day of the selected month
            frm.set_value('monat', frappe.datetime.obj_to_str(selectedDate));
        }
    },
    // When an item is added to tbl_startbetrag
    tbl_startbetrag_add: function(frm, cdt, cdn) {
        // Add a corresponding entry in tbl_endbetrag
        var new_row = frm.add_child('tbl_endbetrag');
        frm.refresh_field('tbl_endbetrag');
    },
    tbl_startbetrag_remove: function(frm, cdt, cdn) {
        // Logic when a row is removed from tbl_startbetrag
        frappe.confirm('Are you sure you want to remove this entry?',
            function() {
                // Remove corresponding entry from tbl_endbetrag
                // Logic to identify and remove the corresponding entry
            },
            function() {
                // Action if the user cancels
            }
        );

        calc_startbetrag(frm);
    },
    tbl_endbetrag_add: function(frm, cdt, cdn) {
        // Logic when a new row is added to tbl_endbetrag
        var child = locals[cdt][cdn];
        // Add a corresponding entry in tbl_startbetrag
        var new_child = frm.add_child('tbl_startbetrag');
        new_child.height = child.height; // assuming height is a field you want to copy
        new_child.kategorie = child.kategorie; // assuming kategorie is a field you want to copy
        frm.refresh_field('tbl_startbetrag');
    },

    tbl_endbetrag_remove: function(frm, cdt, cdn) {
        // Logic when a row is removed from tbl_endbetrag
        frappe.confirm('Are you sure you want to remove this entry?',
            function() {
                // Remove corresponding entry from tbl_startbetrag
                // Logic to identify and remove the corresponding entry
            },
            function() {
                // Action if the user cancels
            }
        );
    },
    tbl_startbetrag_render(frm){
        calc_startbetrag(frm);
	},
   

	get_items(frm){
		start_dialog(frm);
	},
    setup(frm) {
        // write setup code
    }
});

frappe.ui.form.on("Startbetrag Item", {
    heigh: function(frm, cdt, cdn){
        frm.save();
        doc = frappe.get_doc(cdt, cdn);
        if (doc.heigh !== undefined && doc.kategorie !== undefined) {
            calculateStartbetrag(frm);
        }
        
      ;  
    },
    kategorie: function(frm, cdt, cdn){
        
        set_category_filter(frm);
    }
});


/*
frappe.ui.form.on("Einnahme Item", {
    //betrag, kategorie, datum, von, [pdf]
    betrag: function(frm, cdt, cdn){
        frm.save();
        doc = frappe.get_doc(cdt, cdn);
        if (doc.betrag !== undefined && doc.kategorie !== undefined && doc.datum !== undefined && doc.von !== undefined) {
            
            //alles zusammen kalkulieren
        }
        
      ;  
    },
    kategorie: function(frm, cdt, cdn){
        
        //set_category_filter(frm);
    },
    datum: function(frm, cdt, cdn){
        
        //set_category_filter(frm);
    },
    von: function(frm, cdt, cdn){
        
        //set_category_filter(frm);
    },
});
*/
frappe.ui.form.on("Einnahme Item", {
    betrag: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
    kategorie: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
});

frappe.ui.form.on("Ausgabe Item", {
    betrag: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
    kategorie: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
});

frappe.ui.form.on("Transaktion Item", {
    betrag: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
    source: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
    dest: function(frm, cdt, cdn){
        update_endbetrag(frm)
    },
});

function update_endbetrag(frm){
    frm.save();
    let doc = frappe.get_doc(cdt, cdn);
    if (doc.betrag !== undefined && doc.kategorie !== undefined && doc.datum !== undefined && doc.von !== undefined) {

        // Clear tbl_endbetrag
        frm.set_value("tbl_endbetrag", []);
        // Fetch the items from tbl_startbetrag
        let startItems = frm.doc.tbl_startbetrag || [];

        // Iterate over startItems to populate tbl_endbetrag
        startItems.forEach(item => {
            let endItem = {
                kategorie: item.kategorie,
                height: item.heigh  // Changed from 'heigh' based on the document structure
            };

            // Add values from tbl_einnahme
            frm.doc.tbl_einnahme.forEach(einnahmeItem => {
                if (einnahmeItem.kategorie === item.kategorie) {
                    endItem.height += einnahmeItem.betrag;  // Changed from 'heigh' to 'height'
                }
            });

            // Subtract values from tbl_ausgabe
            frm.doc.tbl_ausgabe.forEach(ausgabeItem => {
                if (ausgabeItem.kategorie === item.kategorie) {
                    endItem.height -= ausgabeItem.betrag;  // Changed from 'heigh' to 'height'
                }
            });

            // Adjust for transactions in tbl_transaktion
            frm.doc.tbl_transaktion.forEach(transaktionItem => {
                if (transaktionItem.source === item.kategorie) {
                    endItem.height -= transaktionItem.betrag;  // Changed from 'heigh' to 'height'
                }
                if (transaktionItem.dest === item.kategorie) {
                    endItem.height += transaktionItem.betrag;  // Changed from 'heigh' to 'height'
                }
            });

            frm.add_child("tbl_endbetrag", endItem);
        });
        frm.refresh_field("tbl_endbetrag");
        frm.save();
    }
}

/*
frappe.ui.form.on("Einnahme Item", {
    //betrag, kategorie, datum, von, [pdf]
    betrag: function(frm, cdt, cdn){
        frm.save();
        doc = frappe.get_doc(cdt, cdn);
        if (doc.betrag !== undefined && doc.kategorie !== undefined && doc.datum !== undefined && doc.von !== undefined) {
            
            //Your task:

            //clear tbl_endbetrag
            // take the items from tbl_startbetrag
            // add to the tbl_startbetrag rows (doctype "Startbetrag Item") the values from tbl_einnahme (doctype "Einnahme Item") according to the "kategorie"
            // subtract the values from tbl_ausgabe (doctype "Ausgabe Item")  according to the "kategorie"
            // from tbl_transaktion subtract and add according to kategorie
        }
        
      ;  
    },
});
*/

frappe.ui.form.on("Endbetrag Item", {

    height: function(frm, cdt, cdn){
        
        doc = frappe.get_doc(cdt, cdn);
        if (doc.height !== undefined && doc.kategorie !== undefined) {
            frm.save();
            calculateEndbetrag(frm);
        }
    },
    kategorie: function(frm, cdt, cdn){
        
        doc = frappe.get_doc(cdt, cdn);
        if (doc.height !== undefined && doc.kategorie !== undefined) {
            frm.save();
            calculateEndbetrag(frm);
        }
    }
});

function calculateStartbetrag(frm){
    let total_betrag = 0;
    frm.doc.tbl_startbetrag.forEach(s_item =>{
        total_betrag += s_item.heigh;
    });
    frappe.model.set_value("Monat", frm.doc.name, 'startbetrag', total_betrag);
}

function calculateEndbetrag(frm){
    let total_betrag = 0;
    frm.doc.tbl_endbetrag.forEach(e_item =>{
        total_betrag += e_item.height;
    });
    frappe.model.set_value("Monat", frm.doc.name, 'endbetrag', total_betrag);
}

frappe.ui.form.on('Ausgabe Item', {
    budget: function(frm, cdt, cdn) {
        // Get the current row in the child table
        update_AusgabeItem(frm, cdt, cdn)
    },

    betrag: function(frm, cdt, cdn) {
        // Get the current row in the child table
        update_AusgabeItem(frm, cdt, cdn)
    }
});
function update_AusgabeItem(frm, cdt, cdn) {
    // Check if the necessary fields have values
    doc = frappe.get_doc(cdt, cdn)
    if(doc.betrag && doc.datum && doc.kategorie && doc.budget){

        frm.save();
        calculateBudget(frm);
    }
}

function calculateBudget(frm) {
    // Assuming budgetItems and ausgabeItems are correctly fetched and are arrays of document objects

    let ausgabeItems = undefined;
    let budgetItems = undefined;
    frappe.call({
        async: false,
        method: 'books.finanzen.doctype.ausgabe_item.ausgabe_item.get_ausgabe_items',
        args: {
            'parent_name': frm.doc.name
        },
        callback: function(response) {
            ausgabeItems = response.message;
            console.log(ausgabeItems); // Process the budget items as needed
            
        }
    });

    frappe.call({
        async: false,
        method: 'books.finanzen.doctype.budget_item.budget_item.get_budget_items',
        args: {
            'parent_name': frm.doc.name
        },
        callback: function(response) {
            budgetItems = response.message;
        }
    });

    if (budgetItems !== undefined && ausgabeItems !== undefined ) {
        //frm.save()
        budgetItems.forEach(b_item => {
            let totalExpenditure = 0;
            let totalBudget = b_item.betrag;

            // Calculate total expenditure for the budget item
            ausgabeItems.forEach(a_item => {
                if (a_item.budget === b_item.name) {
                    totalExpenditure += a_item.betrag;
                }
            });

            let remainingBudget = totalBudget - totalExpenditure;

            // Update virtual fields for relevant Ausgabe Items
            ausgabeItems.forEach(a_item => {
                if (a_item.budget === b_item.name) {
                    // Update the virtual fields in the Ausgabe Item row
                    
                    frappe.model.set_value("Ausgabe Item", a_item.name, 'gesamtbudget', totalBudget);
                    frappe.model.set_value("Ausgabe Item", a_item.name, 'restbudget', remainingBudget);
                }
            });
        });
    }
    

    
}




frappe.ui.form.on('Budget Item', {
    von_budget: function(frm, cdt, cdn) {
        // Get the current row in the child table
        let row = locals[cdt][cdn];

        // Check if a budget is selected
        if (row.von_budget) {
            // Fetch the data from the selected budget
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Budget', // Replace with the actual Doctype of the budget
                    name: row.von_budget
                },
                callback: function(r) {
                    if (r.message) {
                        // Update the fields in the child table row
                        frappe.model.set_value(cdt, cdn, 'budget_name', r.message.budget_name); // Assuming 'name' is the field to be updated
                        frappe.model.set_value(cdt, cdn, 'betrag', r.message.betrag); // Assuming 'betrag' is the field to be updated
                    }
                }
            });
        }
    }
});






/*
frappe.ui.form.on('Betrag', { // The child table is defined in a DoctType called "Dynamic Link"
    betrag(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        // frm: current ToDo form
        // cdt: child DocType 'Dynamic Link'
        // cdn: child docname (something like 'a6dfk76')
        // cdt and cdn are useful for identifying which row triggered this event
        
        betrag = frm.fields_dict.betrag.value;
        
        updateRestBudget(frm, cdt, cdn);
    },
    kategorie(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        
        kategorie = frm.fields_dict.kategorie.value;
        
        updateGesamtBudget(frm, cdt, cdn);
        //updateRestBudget(frm, cdt, cdn);

    },
    datum(frm, cdt, cdn) { // "links" is the name of the table field in ToDo, "_add" is the event
        
        datum = frm.fields_dict.datum.value;
        
        updateRestBudget(frm, cdt, cdn);
    }
});
*/






















function getDatum(monat, tag) {
    const monate = { jan: 0, feb: 1, mar: 2, apr: 3, mai: 4, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dez: 11 };
    const monatIndex = monate[monat.toLowerCase()];

    // Aktuelles Jahr für die Datumserstellung
    const jahr = new Date().getFullYear();

    // Wenn der Tag positiv ist, verwenden wir ihn direkt
    if (tag > 0) {
        return new Date(jahr, monatIndex, tag);
    } 
    // Wenn der Tag negativ ist, zählen wir von hinten
    else {
        // Finde den letzten Tag des Monats
        const letzterTag = new Date(jahr, monatIndex + 1, 0).getDate();
        // Berechne den Datum von hinten
        return new Date(jahr, monatIndex, letzterTag + tag + 1);
    }
}


function start_dialog(frm) {

    //var transaction_controller = new erpnext.TransactionController({ frm: frm });

    var mon = frm.get_field("monat");
    if (frm.get_field("monat")) {
    let dialog = new frappe.ui.form.MultiSelectDialog({

        // Read carefully and adjust parameters
        doctype: "Vorlage", // Doctype we want to pick up
        target: frm,
        setters: {
            // MultiDialog Filterfields
            // customer: frm.doc.customer,
        },
        date_field: "creation", // "modified", "creation", ...
        get_query() {
            // MultiDialog Listfilter
            return {
                filters: {  }
            };
        },
        action(selections) {
            for(var n = 0; n < selections.length; n++){
                var name = selections[n];
                var items_idx = 0;
                frappe.db.get_doc("Vorlage", name) // Again, the Doctype we want to pick up
                .then(doc_vorl => {
                    console.log(doc_vorl);
                    // Remove the first empty element of the table
                    tabellen = ['tbl_einnahme', 'tbl_ausgabe', 'tbl_transaktion'];
                    for ( let tbl_idx=0; tbl_idx<tabellen.length; tbl_idx++ ) {
                        var tbl_name = tabellen[tbl_idx];
                        try {
                            let last = frm.get_field(tbl_name).grid.grid_rows.length -1;
                            items_idx = last;
                            if(!('kategorie' in frm.get_field(tbl_name).grid.grid_rows[last].doc)){
                                frm.get_field(tbl_name).grid.grid_rows[0].remove();
                                frm.refresh_fields(tbl_name);
                            }
                        } catch (error) {
                            console.log(error);
                            var row=frm.add_child(tbl_name); // add row
                            frm.refresh_fields(tbl_name); // Refresh Tabelle
                        }
                        // Run through all items of the template quotation
                        for(var k = 0; k < doc_vorl[tbl_name].length; k++){

                            console.log(doc_vorl[tbl_name][k]);
                            var item = doc_vorl[tbl_name][k];
                            var row = frm.add_child(tbl_name);
                            frm.refresh_fields(tbl_name);

                            // Copy-Paste Operation
                            let idx = items_idx+1;
                            let fields = ['betrag', 'kategorie', 'von'];
                            for(var m = 0; m < fields.length; m++){
                                frm.get_field(tbl_name).grid.grid_rows[idx].doc[fields[m]] = item[fields[m]];
                                frm.get_field(tbl_name).grid.grid_rows[idx].refresh_field(fields[m]);
                            }
                            //frm.get_field(tbl_name).grid.grid_rows[idx].doc['datum'] = getDatum("jan",2);
                            //frm.get_field(tbl_name).grid.grid_rows[idx].refresh_field('datum');
                            if(tbl_name == 'tbl_ausgabe'){
                                frm.get_field(tbl_name).grid.grid_rows[idx].doc['budget'] = item['budget'];
                                frm.get_field(tbl_name).grid.grid_rows[idx].refresh_field('budget');
                            }

                            frm.refresh_fields(tbl_name);
                            items_idx++;
                        }
                        
                        // letzte, leere Zeile löschen
                        last_row_idx = frm.get_field(tbl_name).grid.grid_rows.length - 1;
                        if(!('kategorie' in frm.get_field(tbl_name).grid.grid_rows[last_row_idx].doc)){
                            frm.get_field(tbl_name).grid.grid_rows[last_row_idx].remove();
                            
                            frm.refresh_fields(tbl_name);
                        }
                    }
                
                });
            }
        }

            //console.log("after");
            
        
    });
    } else {
        frappe.show_alert('Bitte zuerst einen Monat eintragen!');
        ;
    }
  
  
}


function createNextMonth(currentFrm) {
    // Calculate the next month's date
    let currentDate = currentFrm.doc.monat;
    let nextMonthDate = frappe.datetime.add_months(currentDate, 1);

    // Prepare the new month's data
    let newMonthData = {
        'doctype': 'Monat',
        'monat': nextMonthDate,
        'monat_davor':currentFrm.doc.name,
        // Other necessary fields for the new month can be added here
    };

    var created_month = undefined;

    // Create the new month record
    frappe.call({
        method: 'frappe.client.insert',
        args: {
            doc: newMonthData
        },
        callback: function(response) {
            let newMonth = response.message;
            if(newMonth) {
                // Link the new month in the 'monat_danach' field of the current month
                currentFrm.set_value('monat_danach', newMonth.name);
                currentFrm.save();

                // Get 'endbetrag' items from current month and add them to 'tbl_startbetrag' in the new month
                let endBetragItems = currentFrm.doc.tbl_endbetrag || [];
                let startBetragItems = endBetragItems.map(item => {
                    return {
                        'doctype': 'Startbetrag Item',
                        'heigh': item.height, // Assuming 'height' is the field in 'Endbetrag Item'
                        'kategorie': item.kategorie
                    };
                });

                // Add items to the new month's 'tbl_startbetrag'
                startBetragItems.forEach(item => {
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: item,
                            parent: newMonth.name,
                            parentfield: 'tbl_startbetrag',
                            parenttype: 'Monat'
                        }
                    });
                });

                created_month = newMonth;
                newMonth.save();
                frappe.msgprint('Nächsten Monat erfolgreich angelegt und verknüpft.');
            }
        },
        error: function(error) {
            console.error('Error creating the next month:', error);
            frappe.msgprint('Fehler beim Anlegen des nächsten Monats.');
        },
        success: function(r){
            $(next_month_btn).hide();

            if(frm.doc.monat_danach !== undefined)
                frappe.set_route("Form", "Monat", frm.doc.monat_danach);
        }
    });
    
}

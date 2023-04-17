#include "ram_handling.cpp"


ACTION redeemprtcol::init() {
    require_auth(get_self());
    config.get_or_create(get_self(), config_s{});
}

void redeemprtcol::check_collection_auth(name collection_name, name authorized_account) {
    require_auth(authorized_account);

    auto collection_itr = collections.require_find(collection_name.value,
        "No collection with this name exists");

    check(std::find(
        collection_itr->authorized_accounts.begin(),
        collection_itr->authorized_accounts.end(),
        authorized_account) != collection_itr->authorized_accounts.end(),
        "Account is not authorized"
    );
}

ACTION redeemprtcol::accept(
    name authorized_account,
    name collection_name,
    uint64_t asset_id
) {
    check_collection_auth(collection_name, authorized_account);

    assets_t own_assets = get_assets(get_self());

    auto asset_itr = own_assets.require_find(asset_id, ("Asset ID not found in contract: " + to_string(asset_id)).c_str());

    redemption_t col_redemptions = get_collection_redemptions(asset_itr->collection_name);

    auto redemption_itr = col_redemptions.require_find(asset_id, "No active Redemption for that Asset");
    
    check(redemption_itr->status == "redeemed", "Redemption has already been accepted");

    col_redemptions.modify(redemption_itr, get_self(), [&](auto& _redemption) {
        _redemption.status = "accepted";
    });
}

ACTION redeemprtcol::reject(
    name authorized_account,
    name collection_name,
    uint64_t asset_id,
    string memo
) {
    check_collection_auth(collection_name, authorized_account);

    assets_t own_assets = get_assets(get_self());

    auto asset_itr = own_assets.require_find(asset_id, ("Asset ID not found in contract: " + to_string(asset_id)).c_str());

    redemption_t col_redemptions = get_collection_redemptions(asset_itr->collection_name);

    auto redemption_itr = col_redemptions.require_find(asset_id, "No active Redemption for that Asset");
    
    check(redemption_itr->status == "redeemed", "Redemption has already been accepted");

    vector<uint64_t> assets_to_send = {};

    assets_to_send.push_back(asset_id);

    action(
        permission_level{get_self(), name("active")},
        name("atomicassets"),
        name("transfer"),
        make_tuple(
            get_self(),
            redemption_itr->asset_owner,
            assets_to_send,
            string(memo)
        )
    ).send();

    col_redemptions.erase(redemption_itr);
}

int get_redemption_type(ATTRIBUTE_MAP deserialized_data, vector<FORMAT> formats) {
    int redemption_type = 0;
    for (FORMAT format : formats) {
        if (format.name == "redemption_type") {
            if (format.type == "int8") {
                redemption_type = std::get<int8_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "int16") {
                redemption_type = std::get<int16_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "int32") {
                redemption_type = std::get<int32_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "int64") {
                redemption_type = std::get<int64_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "uint8") {
                redemption_type = std::get<uint8_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "uint16") {
                redemption_type = std::get<uint16_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "uint32") {
                redemption_type = std::get<uint32_t>(deserialized_data["redemption_type"]);
            }
            else if (format.type == "uint64") {
                redemption_type = std::get<uint64_t>(deserialized_data["redemption_type"]);
            } else {
                check(false, "redemption_type of invalid format");
            }
        }
    }

    return redemption_type;
}

ACTION redeemprtcol::release(
    name authorized_account,
    name collection_name,
    uint64_t asset_id
) {
    check_collection_auth(collection_name, authorized_account);

    assets_t own_assets = get_assets(get_self());

    auto asset_itr = own_assets.require_find(asset_id, ("Asset ID not found in contract: " + to_string(asset_id)).c_str());

    redemption_t col_redemptions = get_collection_redemptions(asset_itr->collection_name);

    auto redemption_itr = col_redemptions.require_find(asset_id, "No active Redemption for that Asset");
    
    check(redemption_itr->status == "accepted", "Redemption is not accepted yet or has already been processed");

    schemas_t collection_schemas = get_schemas(asset_itr->collection_name);
    auto schema_itr = collection_schemas.find(asset_itr->schema_name.value);

    int redemption_type = 0;
    bool template_has_attr = false;

    templates_t col_templates = get_templates(asset_itr->collection_name);

    ATTRIBUTE_MAP deserialized_immutable_template_data = {};

    if (asset_itr->template_id > -1) {
        auto template_itr = col_templates.require_find(asset_itr->template_id, "Template not found");

        deserialized_immutable_template_data = deserialize(
            template_itr->immutable_serialized_data,
            schema_itr->format
        );

        template_has_attr = deserialized_immutable_template_data.find("redemption_type") != deserialized_immutable_template_data.end();

        if (template_has_attr) {
            redemption_type = get_redemption_type(deserialized_immutable_template_data, schema_itr->format);
        }
    }

    ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
        asset_itr->immutable_serialized_data,
        schema_itr->format
    );

    check(template_has_attr || deserialized_immutable_data.find("redemption_type") != deserialized_immutable_data.end(),
        ("Redemption Type not found in Asset Attributes" + to_string(asset_id)).c_str());

    if (!template_has_attr) {
        redemption_type = get_redemption_type(deserialized_immutable_data, schema_itr->format);
    }

    if (redemption_type == 0) { // burn
        action(
            permission_level{get_self(), name("active")},
            name("atomicassets"),
            name("burnasset"),
            std::make_tuple(
                get_self(),
                asset_id
            )
        ).send();
    } else if (redemption_type == 1) { // burn and replace
        action(
            permission_level{get_self(), name("active")},
            name("atomicassets"),
            name("burnasset"),
            std::make_tuple(
                get_self(),
                asset_id
            )
        ).send();

        template_has_attr = false;

        uint64_t template_id = 0;

        if (asset_itr->template_id > -1) {
            template_has_attr = deserialized_immutable_template_data.find("redemption_template") != deserialized_immutable_template_data.end();

            if (template_has_attr) {
                template_id = std::get<uint64_t>(deserialized_immutable_data["redemption_template"]);
            }
        }

        if (!template_has_attr) {
            check(deserialized_immutable_data.find("redemption_template") != deserialized_immutable_data.end(),
                ("Redemption Template not found in Asset Attributes" + to_string(asset_id)).c_str());

            template_id = std::get<uint64_t>(deserialized_immutable_data["redemption_template"]);
        }   

        auto template_itr = col_templates.require_find(template_id, "Template not found");

        int max_ram_cost = 151;

        assets_t claimer_assets = get_assets(redemption_itr->asset_owner);
        if (claimer_assets.begin() == claimer_assets.end()) {
            //Asset table scope
            max_ram_cost += 112;
        }

        if (max_ram_cost > 0) {
            decrease_collection_ram_balance(collection_name, max_ram_cost,
                "The collection does not have enough RAM to mint the assets");
        }

        check(template_itr->max_supply == 0 || template_itr->issued_supply < template_itr->max_supply, 
              "Max template supply will be overdrawn by redemption");

        MINTASSET_DATA data = {
            .authorized_minter = get_self(),
            .collection_name = collection_name,
            .schema_name = template_itr->schema_name,
            .template_id = template_itr->template_id,
            .new_asset_owner = redemption_itr->asset_owner,
        };
        
        action(
            permission_level{get_self(), name("active")},
            name("atomicassets"),
            name("mintasset"),
            move(data)
        ).send();
    } else if (redemption_type == 2) { // mark and return

        ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
            asset_itr->mutable_serialized_data,
            schema_itr->format
        );

        check(deserialized_mutable_data.find("redemption_status") != deserialized_mutable_data.end(),
            ("Redemption Status not found in Asset Mutable Data for Asset " + to_string(asset_id)).c_str());

        deserialized_mutable_data["redemption_status"] = "redeemed";

        SET_ASSET_DATA data = {
            .authorized_editor = get_self(),
            .asset_owner = get_self(),
            .asset_id = asset_id,
            deserialized_mutable_data 
        };

        action(
            permission_level{get_self(), name("active")},
            name("atomicassets"),
            name("setassetdata"),
            move(data)
        ).send();
    }

    col_redemptions.erase(redemption_itr);
}

ACTION redeemprtcol::settr(name new_token_receiver) {
    require_auth(get_self());
    config_s current_config = config.get();
    current_config.token_receiver = new_token_receiver;
    config.set(current_config, get_self());
}

void redeemprtcol::check_has_collection_auth(
    name account_to_check,
    name collection_name,
    string error_message
) {
    auto collection_itr = collections.require_find(collection_name.value,
        "No collection with this name exists");

    bool found = false;
    for (int i = 0; i < collection_itr->authorized_accounts.size() && !found; ++ i) {
        if (collection_itr->authorized_accounts[i].value == account_to_check.value) {
            found = true;
        }
    }

    check(found, error_message);
}

ACTION redeemprtcol::redeem(
    name asset_owner,
    uint64_t asset_id
) {
    config_s current_config = config.get();
    uint64_t redemption_id = current_config.redemption_counter++;
    name token_receiver = current_config.token_receiver;
    config.set(current_config, get_self());

    assets_t own_assets = get_assets(get_self());

    auto asset_itr = own_assets.require_find(asset_id, ("Asset ID not found in contract: " + to_string(asset_id)).c_str());

    schemas_t collection_schemas = get_schemas(asset_itr->collection_name);
    auto schema_itr = collection_schemas.find(asset_itr->schema_name.value);
    
    auto user_itr = userassets.require_find(asset_id, ("Asset ID not found in user assets: " + to_string(asset_id)).c_str());

    templates_t col_templates = get_templates(asset_itr->collection_name);

    bool template_has_attr = false;

    uint64_t redemption_type = 0;

    if (asset_itr->template_id > -1) {
        auto template_itr = col_templates.require_find(asset_itr->template_id, "Template not found");

        ATTRIBUTE_MAP deserialized_immutable_template_data = deserialize(
            template_itr->immutable_serialized_data,
            schema_itr->format
        );

        template_has_attr = deserialized_immutable_template_data.find("redemption_type") != deserialized_immutable_template_data.end();

        if (template_has_attr) {
            redemption_type = get_redemption_type(deserialized_immutable_template_data, schema_itr->format);
        }
    }

    ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
        asset_itr->immutable_serialized_data,
        schema_itr->format
    );

    check(template_has_attr || deserialized_immutable_data.find("redemption_type") != deserialized_immutable_data.end(),
    ("Redemption Type not found in Asset Attributes" + to_string(asset_id)).c_str());

    ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
        asset_itr->mutable_serialized_data,
        schema_itr->format
    );

    check(deserialized_mutable_data.find("redemption_status") != deserialized_mutable_data.end(),
        ("Redemption Status not found in Asset Mutable Data for Asset " + to_string(asset_id)).c_str());

    if (template_has_attr) {
        redemption_type = get_redemption_type(deserialized_immutable_data, schema_itr->format);
    }

    if (redemption_type == 1 || redemption_type == 2) {
        check_has_collection_auth(
            get_self(),
            asset_itr->collection_name,
            "The contract is not authorized to mint or update assets"
        );
    }

    if (redemption_type == 1) { // burn and replace
        templates_t col_templates = get_templates(asset_itr->collection_name);
        auto template_itr = col_templates.require_find(asset_itr->template_id, "Template not found");

        int max_ram_cost = 151;

        assets_t claimer_assets = get_assets(asset_owner);
        if (claimer_assets.begin() == claimer_assets.end()) {
            //Asset table scope
            max_ram_cost += 112;
        }

        if (max_ram_cost > 0) {
            test_collection_ram_balance(asset_itr->collection_name, max_ram_cost,
                "The collection does not have enough RAM to mint the assets");
        }

        check(template_itr->max_supply == 0 || template_itr->issued_supply < template_itr->max_supply, 
              "Max template supply may be overdrawn by redemption");

    }

    // Scope on Collection Name
    redemption_t col_redemptions = get_collection_redemptions(asset_itr->collection_name);
    
    col_redemptions.emplace( get_self(), [&]( auto& row ) {
        row.asset_id = asset_id;
        row.asset_owner = user_itr->asset_owner;
        row.status = "redeemed";
    });

    userassets.erase(user_itr);
}

void redeemprtcol::receive_token_transfer(
    name from,
    name to,
    asset quantity,
    string memo
) {
    name contract = get_first_receiver();
    
    if (to != get_self() || memo.find("deposit_collection_ram:") != 0) {
        return;
    }

    if (memo.find("deposit_collection_ram:") == 0) {
        check(contract == CORE_TOKEN_CONTRACT && quantity.symbol == CORE_SYMBOL,
            "Must transfer WAX when depositing RAM");

        name parsed_collection_name = name(memo.substr(23));

        collections.require_find(parsed_collection_name.value,
            ("No collection with this name exists: " + parsed_collection_name.to_string()).c_str());

        action(
            permission_level{get_self(), name("active")},
            get_self(),
            name("buyramproxy"),
            std::make_tuple(
                parsed_collection_name,
                quantity
            )
        ).send();
    }
}

void redeemprtcol::receive_asset_transfer(
    name from,
    name to,
    vector<uint64_t> asset_ids,
    string memo
) {
    if (to != get_self()) {
        return;
    }

    check(memo.find("redeem") == 0, "Invalid Memo.");

    assets_t own_assets = get_assets(get_self());

    for (uint64_t asset_id : asset_ids) {
        auto asset_itr = own_assets.require_find(asset_id, ("Asset ID not found in contract: " + to_string(asset_id)).c_str());

        schemas_t collection_schemas = get_schemas(asset_itr->collection_name);
        auto schema_itr = collection_schemas.find(asset_itr->schema_name.value);

        bool template_has_attr = false;

        if (asset_itr->template_id > -1) {
            templates_t col_templates = get_templates(asset_itr->collection_name);

            auto template_itr = col_templates.require_find(asset_itr->template_id, "Template not found");

            ATTRIBUTE_MAP deserialized_immutable_template_data = deserialize(
                template_itr->immutable_serialized_data,
                schema_itr->format
            );

            template_has_attr = deserialized_immutable_template_data.find("redemption_type") != deserialized_immutable_template_data.end();
        }

        ATTRIBUTE_MAP deserialized_immutable_data = deserialize(
            asset_itr->immutable_serialized_data,
            schema_itr->format
        );

        check(template_has_attr || deserialized_immutable_data.find("redemption_type") != deserialized_immutable_data.end(),
        ("Redemption Type not found in Asset Immutable Data" + to_string(asset_id)).c_str());

        ATTRIBUTE_MAP deserialized_mutable_data = deserialize(
            asset_itr->mutable_serialized_data,
            schema_itr->format
        );

        check(deserialized_mutable_data.find("redemption_status") != deserialized_mutable_data.end(),
            ("Redemption Status not found in Asset Mutable Data for Asset " + to_string(asset_id)).c_str());
    
        userassets.emplace( get_self(), [&]( auto& row ) {
            row.asset_id = asset_id;
            row.asset_owner = from;
            row.deposit_time = current_time_point().sec_since_epoch();
        });
    }
}
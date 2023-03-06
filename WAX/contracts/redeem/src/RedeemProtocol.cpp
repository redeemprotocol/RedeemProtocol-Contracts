#include <redeemprotocol.hpp>

ACTION redeemprotocol::init() {
    require_auth(get_self());
    config.get_or_create(get_self(), config_s{});
}

ACTION redeemprotocol::mark(
    name asset_owner,
    string order_id,
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto a = get_asset(asset_owner);
    auto aitr = a.find(asset_id);
    check(aitr != a.end(),
        "not asset owner");


    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    config.set(current_config, get_self());
    
    r.emplace( asset_owner, [&]( auto& row ) {
        row.order_id = order_id;
        row.asset_id = asset_id;
        row.method = string("mark");
        row.requester = asset_owner;
    });
}

ACTION redeemprotocol::transfer(
    name asset_owner,
    string order_id,
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    name token_receiver = current_config.token_receiver;
    config.set(current_config, get_self());
    
    r.emplace( asset_owner, [&]( auto& row ) {
        row.order_id = order_id;
        row.asset_id = asset_id;
        row.method = string("transfer");
        row.requester = asset_owner;
    });

    vector<uint64_t> asset_ids{asset_id};
    action(
        permission_level{asset_owner, name("active")},
        name("atomicassets"),
        name("transfer"),
        make_tuple(
            asset_owner,
            token_receiver,
            asset_ids,
            string("RE:DREAMER redemption"))
    ).send();
}

ACTION redeemprotocol::burn(
    name asset_owner,
    string order_id,
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    config.set(current_config, get_self());
    
    r.emplace( asset_owner, [&]( auto& row ) {
        row.order_id = order_id;
        row.asset_id = asset_id;
        row.method = string("burn");
        row.requester = asset_owner;
    });

    action(
        permission_level{asset_owner, name("active")},
        name("atomicassets"),
        name("burnasset"),
        make_tuple(
            asset_owner,
            asset_id)
    ).send();
}

ACTION redeemprotocol::settr(name new_token_receiver) {
    require_auth(get_self());
    config_s current_config = config.get();
    current_config.token_receiver = new_token_receiver;
    config.set(current_config, get_self());
}

ACTION redeemprotocol::refund(uint64_t asset_id) {
    config_s current_config = config.get();
    require_auth(current_config.token_receiver);
    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr != r.end(),
        "redemption not found");

    if (itr->method == "transfer") {
        vector<uint64_t> asset_ids{asset_id};
        action(
            permission_level{current_config.token_receiver, name("active")},
            name("atomicassets"),
            name("transfer"),
            make_tuple(
                current_config.token_receiver,
                itr->requester,
                asset_ids,
                string("RE:DREAMER refund"))
        ).send();
    }

    r.erase(itr);
}

redeemprotocol::redemption_t redeemprotocol::get_redemption() {
    return redemption_t(get_self(), get_self().value);
}

redeemprotocol::assets_t redeemprotocol::get_asset(name owner) {
    return assets_t("atomicassets"_n, owner.value);
}

void redeemprotocol:: {

}
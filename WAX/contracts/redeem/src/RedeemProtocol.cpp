#include <redeemprotocol.hpp>

ACTION redeemprotocol::init() {
    require_auth(get_self());
    config.get_or_create(get_self(), config_s{});
}

ACTION redeemprotocol::mark(
    name asset_owner,
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    uint64_t redemption_id = current_config.redemption_counter++;
    config.set(current_config, get_self());
    
    r.emplace( get_self(), [&]( auto& row ) {
        row.redemption_id = redemption_id;
        row.asset_id = asset_id;
        row.redeemer = asset_owner;
        row.method = string("mark");
    });
}

ACTION redeemprotocol::transfer(
    name asset_owner,
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    uint64_t redemption_id = current_config.redemption_counter++;
    name token_receiver = current_config.token_receiver;
    config.set(current_config, get_self());
    
    r.emplace( get_self(), [&]( auto& row ) {
        row.redemption_id = redemption_id;
        row.asset_id = asset_id;
        row.redeemer = asset_owner;
        row.method = string("transfer");
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
    uint64_t asset_id)
{
    require_auth(asset_owner);

    auto r = get_redemption();
    auto itr = r.find(asset_id);
    check(itr == r.end(),
        "This asset has been redeemed");
    
    config_s current_config = config.get();
    uint64_t redemption_id = current_config.redemption_counter++;
    config.set(current_config, get_self());
    
    r.emplace( get_self(), [&]( auto& row ) {
        row.redemption_id = redemption_id;
        row.asset_id = asset_id;
        row.redeemer = asset_owner;
        row.method = string("burn");
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

redeemprotocol::redemption_t redeemprotocol::get_redemption() {
    return redemption_t(get_self(), get_self().value);
}
